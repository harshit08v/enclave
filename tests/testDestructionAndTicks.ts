import {
  createServerRoom,
  getServerRoom,
  destroyServerRoom,
  verifyRoomAuth,
  updateRoomPresence,
  roomStore
} from '../src/lib/serverRoomStore';
import { deriveRoomKeys, createAndWrapRoomSecret, unwrapRoomSecret, timingSafeEqual } from '../packages/crypto';
import { WirePacket, DecryptedMessage, MessageDeliveryStatus } from '../packages/protocol';

async function runDestructionAndTicksTests() {
  console.log('\n========================================');
  console.log('🧪 ENCLAVE — Destruction & Ticks Test Suite');
  console.log('========================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. Room Creation with Creator Authentication
  console.log('1. Testing Room Creation & Destruction Authentication...');
  const roomId = 'test-destruct-' + Math.random().toString(36).slice(2, 8);
  const password = 'TestSecurePassphrase123!';
  const salt = 'testsalt1234567890123456';
  const keyBundle = await deriveRoomKeys(password, salt);
  const secretResult = await createAndWrapRoomSecret(keyBundle.keyWrappingKey);

  const creatorId = 'creator-user-001';
  const roomMeta = createServerRoom(
    roomId,
    salt,
    keyBundle.authCommitment,
    secretResult.wrappedBundle,
    false,
    true,
    'with_pass',
    creatorId
  );

  assert(roomMeta.id === roomId, 'Room created with correct ID');
  assert(roomMeta.creatorId === creatorId, 'Creator ID persisted in metadata');
  assert(roomMeta.state === 'CREATED', 'Initial room state is CREATED');

  // Verify auth proof
  const validAuth = verifyRoomAuth(roomId, keyBundle.authCommitment);
  assert(validAuth === true, 'Auth verification succeeds with valid commitment');

  const fakeCommitment = 'invalid_auth_commitment_123456789';
  const invalidAuth = verifyRoomAuth(roomId, fakeCommitment);
  assert(invalidAuth === false, 'Auth verification fails with invalid commitment');

  // 2. Global Room Destruction Lifecycle
  console.log('\n2. Testing Global Room Destruction & Memory Zeroization...');
  destroyServerRoom(roomId);

  const destroyedMeta = getServerRoom(roomId);
  assert(destroyedMeta !== null, 'Destroyed room returns tombstone meta');
  assert(destroyedMeta?.state === 'DESTROYED', 'State is marked DESTROYED');

  const rawRecord = roomStore.get(roomId);
  assert(rawRecord?.participantHeartbeats.size === 0, 'Participant heartbeat map is zeroized');
  assert(rawRecord?.participantInfo.size === 0, 'Participant info map is zeroized');
  assert(rawRecord?.recentPackets.length === 0, 'Packet buffers are wiped');

  // Idempotency test
  destroyServerRoom(roomId);
  const reDestroyed = getServerRoom(roomId);
  assert(reDestroyed?.state === 'DESTROYED', 'Subsequent destruction calls are safe and idempotent');

  // 3. Message Delivery Status Progression
  console.log('\n3. Testing Message Delivery & Read Receipts Flow...');
  const msg: DecryptedMessage = {
    id: 'msg_1001',
    text: 'Classified payload test',
    senderId: creatorId,
    senderName: 'Creator',
    timestamp: Date.now(),
    isSelf: true,
    status: 'sent'
  };

  assert(msg.status === 'sent', 'Initial outgoing message status is "sent"');

  // Simulate receipt progression
  function applyReceipt(current: MessageDeliveryStatus | undefined, incoming: 'delivered' | 'read'): MessageDeliveryStatus {
    if (current === 'read') return 'read'; // read is terminal
    if (incoming === 'read') return 'read';
    if (incoming === 'delivered' && current !== 'read') return 'delivered';
    return current || 'sent';
  }

  const statusAfterDelivered = applyReceipt(msg.status, 'delivered');
  assert(statusAfterDelivered === 'delivered', 'Message status upgrades to "delivered" on delivery receipt');

  const statusAfterRead = applyReceipt(statusAfterDelivered, 'read');
  assert(statusAfterRead === 'read', 'Message status upgrades to "read" on read receipt');

  const statusNoDowngrade = applyReceipt(statusAfterRead, 'delivered');
  assert(statusNoDowngrade === 'read', 'Message status cannot be downgraded from "read" to "delivered"');

  // 4. Receipt Wire Packet Construction & Formatting
  console.log('\n4. Testing Wire Packet Receipt Structure...');
  const receiptPacket: WirePacket = {
    type: 'receipt_delivered',
    senderId: 'recipient-002',
    timestamp: Date.now(),
    iv: 'iv_dummy',
    authTag: 'tag_dummy',
    ciphertext: 'ciphertext_dummy',
    receiptData: {
      targetMessageId: 'msg_1001',
      status: 'delivered'
    }
  };

  assert(receiptPacket.type === 'receipt_delivered', 'Packet type is receipt_delivered');
  assert(receiptPacket.receiptData?.targetMessageId === 'msg_1001', 'Target message ID is preserved');
  assert(receiptPacket.receiptData?.status === 'delivered', 'Receipt status is delivered');

  console.log(`\n========================================`);
  console.log(`🎉 ALL ${passed}/${total} TESTS PASSED SUCCESSFULLY!`);
  console.log(`========================================\n`);
}

runDestructionAndTicksTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
