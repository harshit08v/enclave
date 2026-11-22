const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\harsh\\.gemini\\antigravity\\brain\\0b61b0c5-653b-4eb1-ba42-872d32663d21\\screenshots';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const liveRoomUrl = 'https://enclave.vercel.app/r/chamber-9hvlmy';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();

  // 1. Guest Chamber Join Prompt - Desktop (1440x900)
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(liveRoomUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outDir, 'live_guest_join_prompt_desktop.png') });
  console.log('✔ live_guest_join_prompt_desktop.png');

  // 2. Guest Chamber Join Prompt - Mobile (390x844)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'live_guest_join_prompt_mobile.png') });
  console.log('✔ live_guest_join_prompt_mobile.png');

  // 3. Enter Guest Name & Passkey (Desktop)
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    // Input 0: Name, Input 1: Pass
    await inputs[0].type('Avery Sterling (Guest Counterparty)');
    await inputs[1].type('vault-pass-secret-99');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(outDir, 'live_guest_inputs_filled.png') });
    console.log('✔ live_guest_inputs_filled.png');

    // Click submit button to join chamber
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Clicked join chamber as guest...');
      await new Promise(r => setTimeout(r, 3500));
      await page.screenshot({ path: path.join(outDir, 'live_guest_chamber_inside.png') });
      console.log('✔ live_guest_chamber_inside.png');
    }
  }

  // 4. Admin Users Directory & Guest Session Audit
  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1440, height: 950, deviceScaleFactor: 2 });
  await adminPage.goto('https://enclave.vercel.app/admin/users', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  await adminPage.screenshot({ path: path.join(outDir, 'live_admin_users_guest_sessions.png') });
  console.log('✔ live_admin_users_guest_sessions.png');

  // 5. Admin Audit Log with Quick Filters
  await adminPage.goto('https://enclave.vercel.app/admin/audit', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  await adminPage.screenshot({ path: path.join(outDir, 'live_admin_audit_logs.png') });
  console.log('✔ live_admin_audit_logs.png');

  await browser.close();
  console.log('ALL VERIFICATION SCREENSHOTS CAPTURED!');
})();
