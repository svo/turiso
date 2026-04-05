'use strict';

const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROMIUM_PATH = '/usr/bin/chromium';
const USER_DATA_DIR = path.join(process.env.HOME, '.openclaw', 'chromium-data');

async function main() {
  const cookiesJson = process.env.TURISO_GOOGLE_COOKIES;
  if (!cookiesJson) {
    console.log('TURISO_GOOGLE_COOKIES not set, skipping cookie injection');
    return;
  }

  let cookies;
  try {
    cookies = JSON.parse(cookiesJson);
  } catch (err) {
    console.error('Failed to parse TURISO_GOOGLE_COOKIES:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(cookies) || cookies.length === 0) {
    console.error('TURISO_GOOGLE_COOKIES must be a non-empty JSON array of cookie objects');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  try {
    const page = await browser.newPage();

    // Filter to Google domain cookies only for safety
    const googleCookies = cookies.filter(c =>
      c.domain && (c.domain === '.google.com' || c.domain === 'google.com' ||
        c.domain.endsWith('.google.com'))
    );

    if (googleCookies.length === 0) {
      console.error('No .google.com cookies found in TURISO_GOOGLE_COOKIES');
      process.exit(1);
    }

    await page.setCookie(...googleCookies);

    // Navigate to google.com to establish the session in the profile
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Injected ' + googleCookies.length + ' Google cookies into ' + USER_DATA_DIR);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Cookie injection failed:', err.message);
  process.exit(1);
});
