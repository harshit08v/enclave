# ENCLAVE Wire & State Protocol — Hardened V1

## 1. Room Lifecycle State Machine

The ENCLAVE server strictly enforces an atomic 6-state lifecycle state machine. State transitions are verified server-side.

```
   [ CREATION ]
        │
        ▼
   ┌─────────┐     First Participant Joins
   │ CREATED │ ───────────────────────────────┐
   └─────────┘                                │
        │                                     ▼
        │ (10m abandoned timeout)       ┌───────────┐
        └─────────────────────────────> │  WAITING  │ (1 participant inside, awaiting counterparty)
                                        └───────────┘
                                              │
                                              │ Second Participant Joins
                                              ▼
                                        ┌───────────┐
                                        │  ACTIVE   │ (>= 2 participants, E2EE exchange active)
                                        └───────────┘
                                              │
                                              │ Participant Departs (Count drops to 1)
                                              ▼
                                        ┌───────────┐
                                        │  ENDING   │ (1 participant remains)
                                        └───────────┘
                                              │
                                              │ Final Participant Departs (Count drops to 0)
                                              ▼
                                       ┌──────────────┐
                                       │  DESTROYING  │ (Buffers purged, keys detached, sockets severed)
                                       └──────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │  DESTROYED   │ (Permanent tombstone; all actions return HTTP 410)
                                       └──────────────┘
```

### Invariants:
1. **Zero Resurrection**: Once a chamber transitions to `DESTROYING` or `DESTROYED`, all subsequent join attempts, packet transmissions, and presence heartbeats are permanently rejected with HTTP 410 Gone.
2. **Atomic Dissolution**: Simultaneous leave operations are processed atomically; the final departure triggers immediate buffer wiping.

---

## 2. Message Wire Envelope Specification

Every packet relayed over the transport layer conforms to the typed schema:

```typescript
export interface WirePacket {
  version: 1;
  packetId: string;       // CSPRNG unique identifier (e.g. 'pkt_001a2b3c')
  roomId: string;         // Enclave room identifier (e.g. '8f92-c0e4')
  senderId: string;       // Sender participant ID
  senderName: string;     // Ephemeral participant display name
  sequence: number;       // Monotonically increasing sequence integer (1, 2, 3...)
  timestamp: number;      // Unix timestamp (ms)
  payload: {
    iv: string;           // Base64 96-bit (12-byte) CSPRNG nonce
    ciphertext: string;   // Base64 ciphertext with appended 128-bit authentication tag
    sequence: number;     // Inner sequence counter
    timestamp: number;    // Inner timestamp
  };
  type: 'chat_message' | 'system_notice' | 'typing_indicator' | 'presence_leave';
}
```

---

## 3. Canonical Authenticated Associated Data (AAD)

To prevent cross-session replay, room injection, and metadata tampering, every AES-256-GCM encryption operation binds the following canonical byte string as Associated Authenticated Data:

$$\text{AAD} = \text{"ENCLAVE-v"} \| \text{version} \| \text{"|ROOM:"} \| \text{roomId} \| \text{"|PKT:"} \| \text{packetId} \| \text{"|SENDER:"} \| \text{senderId} \| \text{"|SEQ:"} \| \text{sequence} \| \text{"|TS:"} \| \text{timestamp}$$

If an adversary alters any header field (e.g., swapping `roomId` or `sequence`), AES-GCM decryption fails authentication unconditionally.

---

## 4. Replay & Sequence Verification
1. **Sequence Monotonicity**: Every client increments a local monotonic `sendSequence` counter per chamber.
2. **Sliding Replay Window**: Receivers maintain a seen sequence set and packet ID cache. Replayed sequences or duplicated packet IDs are discarded silently.
3. **Timestamp Skew Limit**: Packets with timestamp skew exceeding 300 seconds are rejected.
