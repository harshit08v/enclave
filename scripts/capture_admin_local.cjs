const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\harsh\\.gemini\\antigravity\\brain\\0b61b0c5-653b-4eb1-ba42-872d32663d21\\screenshots';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 2 });

  // 1. First trigger a guest join via API so the audit log has a verified guest login record
  try {
    const presenceRes = await fetch('http://localhost:3000/api/rooms/chamber-9hvlmy/presence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer open_access'
      },
      body: JSON.stringify({
        action: 'join',
        participantId: 'usr_guest_demo_77',
        displayName: 'Avery Sterling (Guest Counterparty)',
        isGuest: true
      })
    });
    console.log('Presence join simulated status:', presenceRes.status);
  } catch (err) {
    console.log('Presence simulation note:', err.message);
  }

  // 2. Navigate to Admin Login
  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  const userInputs = await page.$$('input');
  if (userInputs.length >= 2) {
    await userInputs[0].type('admin');
    await userInputs[1].type('enclave-admin-dev-key-2026');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // 3. Visit Admin Users page and capture
  await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, 'admin_users_guest_sessions_verified.png') });
  console.log('✔ admin_users_guest_sessions_verified.png');

  // 4. Visit Admin Audit page and capture
  await page.goto('http://localhost:3000/admin/audit', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, 'admin_audit_logs_verified.png') });
  console.log('✔ admin_audit_logs_verified.png');

  await browser.close();
  console.log('Local admin verified capture complete!');
})();
