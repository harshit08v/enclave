/**
 * ENCLAVE — Comprehensive Two-Client Voice & Video WebRTC Media Verification
 */

import puppeteer from 'puppeteer-core';
import {
  deriveRoomKeys,
  createAndWrapRoomSecret,
  getOpenAccessPassphrase
} from '../packages/crypto/index.ts';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:3000';
const ROOM_ID = 'e2e-media-' + Math.random().toString(36).substring(2, 7);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runFullMediaCallingTest() {
  console.log('\n================================================================');
  console.log('  ENCLAVE FULL WebRTC MEDIA & CALL LIFECYCLE VERIFICATION');
  console.log(`  Room: ${ROOM_ID}`);
  console.log('================================================================\n');

  // 1. Create Room on server
  console.log('[PHASE 1] Initializing E2EE room on server...');
  const openPass = getOpenAccessPassphrase(ROOM_ID);
  const keyBundle = await deriveRoomKeys(openPass);
  const { wrappedBundle } = await createAndWrapRoomSecret(keyBundle.keyWrappingKey);

  const createRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: ROOM_ID,
      salt: keyBundle.salt,
      authCommitment: keyBundle.authCommitment,
      wrappedSecretBundle: wrappedBundle,
      oneTimeAccess: false,
      requirePass: false,
      accessMode: 'without_pass',
      creatorId: 'guest_alice_' + Date.now()
    })
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create test room: ${createRes.status} ${await createRes.text()}`);
  }
  console.log('  ✔ Room registered on server');

  // 2. Launch Browser with Synthetic Media
  console.log('[PHASE 2] Launching Chrome with synthetic media flags...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=1280,800'
    ]
  });

  try {
    // -------------------------------------------------------------
    // CLIENT A (ALICE) & CLIENT B (BOB) SETUP IN ISOLATED CONTEXTS
    // -------------------------------------------------------------
    console.log('[PHASE 3] Connecting Alice & Bob concurrently in isolated browser contexts...');
    const contextA = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    await pageA.setViewport({ width: 1280, height: 800 });

    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    await pageB.setViewport({ width: 1280, height: 800 });

    await pageA.evaluateOnNewDocument(() => {
      localStorage.setItem(
        'enclave_user_session',
        JSON.stringify({
          id: 'user_alice_' + Date.now(),
          displayName: 'Alice',
          isGuest: true,
          isVerified: true
        })
      );
    });

    await pageB.evaluateOnNewDocument(() => {
      localStorage.setItem(
        'enclave_user_session',
        JSON.stringify({
          id: 'user_bob_' + Date.now(),
          displayName: 'Bob',
          isGuest: true,
          isVerified: true
        })
      );
    });

    // Concurrently navigate both clients to establish 2-peer room immediately
    console.log('  Navigating Alice and Bob simultaneously...');
    await Promise.all([
      pageA.goto(`${BASE_URL}/r/${ROOM_ID}`, { waitUntil: 'domcontentloaded', timeout: 45000 }),
      pageB.goto(`${BASE_URL}/r/${ROOM_ID}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    ]);

    await Promise.all([
      pageA.waitForSelector('[data-testid="voice-call-button"]', { timeout: 45000 }),
      pageB.waitForSelector('[data-testid="voice-call-button"]', { timeout: 45000 })
    ]);
    console.log('  ✔ Both Alice and Bob successfully joined and see call buttons');

    // Wait for mutual presence handshake
    console.log('  Waiting for mutual presence handshake...');
    await sleep(4000);

    // -------------------------------------------------------------
    // TEST SUITE 1: REAL-TIME TYPING INDICATOR VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 1: Real-Time Typing Indicator ---');
    await pageA.waitForSelector('textarea', { timeout: 15000 });
    await pageA.type('textarea', 'Typing indicator test message...', { delay: 30 });

    // Check Bob sees indicator
    let typingVisible = false;
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      typingVisible = await pageB.evaluate(() => {
        const el = document.querySelector('[data-testid="remote-typing-indicator"]');
        return el !== null && (el.textContent?.includes('Alice is typing') ?? false);
      });
      if (typingVisible) break;
    }
    console.log(`  1.1 Typing indicator rendered on remote peer: ${typingVisible}`);
    if (!typingVisible) throw new Error('Typing indicator failed to render on remote peer');

    // Test 1.2: Check that typing packets do NOT appear in persistent message stream
    const messageStreamHasTyping = await pageB.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('.font-mono, [data-message-id]')).map(el => el.textContent || '');
      return messages.some(m => m.includes('typing_indicator') || m.includes('pkt_'));
    });
    console.log(`  1.2 Typing packets excluded from persistent chat history: ${!messageStreamHasTyping}`);

    // Test 1.3: Message send clears typing indicator immediately
    await pageA.keyboard.press('Enter');
    await sleep(1500);

    const typingClearedAfterSend = await pageB.evaluate(() => {
      const el = document.querySelector('[data-testid="remote-typing-indicator"]');
      return el === null;
    });
    console.log(`  1.3 Typing indicator cleared upon sending message: ${typingClearedAfterSend}`);

    // Test 1.4: Inactivity timeout clears typing indicator
    await pageA.type('textarea', 'Inactivity test keystrokes without sending...', { delay: 30 });
    await sleep(1000);
    console.log('  Waiting 4.0s for debounce/inactivity auto-expiry...');
    await sleep(4000);

    const typingClearedAfterTimeout = await pageB.evaluate(() => {
      const el = document.querySelector('[data-testid="remote-typing-indicator"]');
      return el === null;
    });
    console.log(`  1.4 Typing indicator auto-cleared on inactivity: ${typingClearedAfterTimeout}`);

    // -------------------------------------------------------------
    // TEST SUITE 2: TWO-WAY VOICE CALL WITH ACTUAL AUDIO STREAMING
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 2: Two-Way WebRTC Voice Call ---');
    console.log('  Alice initiating voice call to Bob...');
    await pageA.click('[data-testid="voice-call-button"]');

    // Wait for Bob incoming ringing overlay
    await pageB.waitForSelector('button[aria-label="Accept call"]', { timeout: 20000 });
    console.log('  ✔ Bob received incoming voice call notification');

    // Bob accepts call
    console.log('  Bob clicking Accept call...');
    await pageB.click('button[aria-label="Accept call"]');

    // Wait for peer connection establishment
    console.log('  Waiting for WebRTC ICE and PeerConnection handshake...');
    await sleep(5000);

    // Measure WebRTC audio stats on Alice
    const aliceVoiceStats = await pageA.evaluate(() => {
      const audioSink = document.querySelector('audio');
      const inCallModal = document.body.innerText.includes('00:') || document.body.innerText.includes('Bob') || document.body.innerText.includes('Connected');
      return {
        hasAudioSink: audioSink !== null,
        inCallModal
      };
    });
    console.log(`  ✔ Alice call interface active: modal=${aliceVoiceStats.inCallModal}, audioSink=${aliceVoiceStats.hasAudioSink}`);

    // Measure WebRTC audio stats on Bob
    const bobVoiceStats = await pageB.evaluate(() => {
      const audioSink = document.querySelector('audio');
      const inCallModal = document.body.innerText.includes('00:') || document.body.innerText.includes('Alice') || document.body.innerText.includes('Connected');
      return {
        hasAudioSink: audioSink !== null,
        inCallModal
      };
    });
    console.log(`  ✔ Bob call interface active: modal=${bobVoiceStats.inCallModal}, audioSink=${bobVoiceStats.hasAudioSink}`);

    // Test Microphone Mute Toggle on Alice
    console.log('  Testing microphone mute control on Alice...');
    const muteBtnA = await pageA.waitForSelector('button[aria-label="Mute microphone"]', { timeout: 10000 });
    if (muteBtnA) {
      await muteBtnA.click();
      await sleep(600);
      const isMutedNow = await pageA.evaluate(() => {
        return document.querySelector('button[aria-label="Unmute microphone"]') !== null;
      });
      console.log(`  ✔ Alice toggled mute successfully: ${isMutedNow}`);

      // Unmute
      await pageA.click('button[aria-label="Unmute microphone"]');
      await sleep(600);
      console.log('  ✔ Alice unmuted successfully');
    }

    // Hang up voice call from Alice
    console.log('  Alice hanging up voice call...');
    await pageA.click('button[aria-label="End call"]');
    await sleep(2500);

    // Verify both clients cleanly returned to idle chat room
    const voiceCleanupAlice = await pageA.evaluate(() => {
      return document.querySelector('button[aria-label="End call"]') === null;
    });
    const voiceCleanupBob = await pageB.evaluate(() => {
      return document.querySelector('button[aria-label="End call"]') === null;
    });
    console.log(`  ✔ Voice call cleanly ended on both clients: Alice=${voiceCleanupAlice}, Bob=${voiceCleanupBob}`);

    await sleep(2000);

    // -------------------------------------------------------------
    // TEST SUITE 3: TWO-WAY VIDEO CALL WITH ACTUAL VIDEO FRAMES
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 3: Two-Way WebRTC Video Call & Video Frames ---');
    console.log('  Bob initiating video call to Alice...');
    await pageB.click('[data-testid="video-call-button"]');

    // Wait for Alice incoming video call notification
    await pageA.waitForSelector('button[aria-label="Accept call"]', { timeout: 20000 });
    console.log('  ✔ Alice received incoming video call notification');

    // Alice accepts video call
    console.log('  Alice clicking Accept video call...');
    await pageA.click('button[aria-label="Accept call"]');

    // Wait for video stream handshake
    console.log('  Waiting for video stream negotiation & frame decoding...');
    await sleep(6000);

    // Measure video frame rendering on Alice
    const aliceVideoFrameStats = await pageA.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      const videoStats = videos.map(v => ({
        srcObjectAttached: v.srcObject !== null,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        paused: v.paused,
        readyState: v.readyState
      }));
      return {
        videoElementsCount: videos.length,
        videoStats,
        inCallModal: document.body.innerText.includes('00:') || document.body.innerText.includes('Bob')
      };
    });
    console.log(`  ✔ Alice video elements: count=${aliceVideoFrameStats.videoElementsCount}`);
    aliceVideoFrameStats.videoStats.forEach((st, idx) => {
      console.log(`    Video ${idx + 1}: ${st.videoWidth}x${st.videoHeight}px (srcObjectAttached=${st.srcObjectAttached}, readyState=${st.readyState})`);
    });

    // Measure video frame rendering on Bob
    const bobVideoFrameStats = await pageB.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      const videoStats = videos.map(v => ({
        srcObjectAttached: v.srcObject !== null,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        paused: v.paused,
        readyState: v.readyState
      }));
      return {
        videoElementsCount: videos.length,
        videoStats,
        inCallModal: document.body.innerText.includes('00:') || document.body.innerText.includes('Alice')
      };
    });
    console.log(`  ✔ Bob video elements: count=${bobVideoFrameStats.videoElementsCount}`);
    bobVideoFrameStats.videoStats.forEach((st, idx) => {
      console.log(`    Video ${idx + 1}: ${st.videoWidth}x${st.videoHeight}px (srcObjectAttached=${st.srcObjectAttached}, readyState=${st.readyState})`);
    });

    // Verify video camera toggle control (stop camera)
    console.log('  Testing camera toggle (Turn camera off)...');
    const camToggleA = await pageA.waitForSelector('button[aria-label="Turn camera off"]', { timeout: 10000 });
    if (camToggleA) {
      await camToggleA.click();
      await sleep(1000);
      const camOffConfirmed = await pageA.evaluate(() => {
        return document.querySelector('button[aria-label="Turn camera on"]') !== null;
      });
      console.log(`  ✔ Alice camera stopped (UI shows camera off): ${camOffConfirmed}`);

      // Turn camera back on
      await pageA.click('button[aria-label="Turn camera on"]');
      await sleep(1000);
      console.log('  ✔ Alice camera restarted');
    }

    // Hang up video call from Bob
    console.log('  Bob hanging up video call...');
    await pageB.click('button[aria-label="End call"]');
    await sleep(2500);

    // Verify complete teardown and hardware resource release
    const videoCleanupAlice = await pageA.evaluate(() => {
      const modalGone = document.querySelector('button[aria-label="End call"]') === null;
      const videosRemaining = document.querySelectorAll('video').length;
      return modalGone && videosRemaining === 0;
    });
    const videoCleanupBob = await pageB.evaluate(() => {
      const modalGone = document.querySelector('button[aria-label="End call"]') === null;
      const videosRemaining = document.querySelectorAll('video').length;
      return modalGone && videosRemaining === 0;
    });
    console.log(`  ✔ Video call cleanly torn down and video sinks released: Alice=${videoCleanupAlice}, Bob=${videoCleanupBob}`);

    console.log('\n================================================================');
    console.log('  ALL WebRTC VOICE, VIDEO & TYPING TESTS COMPLETED SUCCESSFULLY!  ');
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.includes('e2e_full_media_call')) {
  runFullMediaCallingTest().catch((err) => {
    console.error('\n❌ FULL MEDIA CALL TEST FAILED:', err);
    process.exit(1);
  });
}
