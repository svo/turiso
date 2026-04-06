'use strict';

const puppeteer = require('puppeteer-core');

const CDP_URL = 'http://127.0.0.1:9222';

async function getWebSocketUrl() {
  const res = await fetch(CDP_URL + '/json/version');
  const data = await res.json();
  return data.webSocketDebuggerUrl;
}

async function isGoogleSignedIn(page) {
  await page.goto('https://myaccount.google.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  const url = page.url();
  return url.startsWith('https://myaccount.google.com');
}

async function main() {
  const wsUrl = await getWebSocketUrl();
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });

  try {
    const page = await browser.newPage();

    try {
      const alreadySignedIn = await isGoogleSignedIn(page);

      if (alreadySignedIn) {
        console.log('Google session active in profile, skipping cookie injection');
        return;
      }

      const cookiesJson = process.env.TURISO_GOOGLE_COOKIES;

      if (!cookiesJson) {
        console.warn('Google not signed in and TURISO_GOOGLE_COOKIES not set');
        console.warn('Agent preflight will report this to the user');
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
        console.error('TURISO_GOOGLE_COOKIES must be a non-empty JSON array');
        process.exit(1);
      }

      const googleCookies = cookies.filter(c =>
        c.domain && (c.domain === '.google.com' || c.domain === 'google.com' ||
          c.domain.endsWith('.google.com'))
      );

      if (googleCookies.length === 0) {
        console.error('No .google.com cookies found in TURISO_GOOGLE_COOKIES');
        process.exit(1);
      }

      await page.setCookie(...googleCookies);
      console.log('Injected ' + googleCookies.length + ' Google cookies');

      const signedInAfterInject = await isGoogleSignedIn(page);

      if (signedInAfterInject) {
        console.log('Cookie injection verified — Google session active');
      } else {
        console.warn('Cookies injected but Google session not active');
        console.warn('Cookies may be expired — re-export and update TURISO_GOOGLE_COOKIES');
        console.warn('Agent preflight will report this to the user');
      }
    } finally {
      await page.close();
    }
  } finally {
    browser.disconnect();
  }
}

main().catch(err => {
  console.error('Cookie check failed:', err.message);
  console.error('Agent preflight will report auth status to the user');
});
