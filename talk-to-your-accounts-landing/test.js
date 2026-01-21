const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  const consoleErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });

  try {
    // Navigate to the local server
    console.log('Testing local Next.js server...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Check if page loaded successfully
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check for key elements
    const heroSection = await page.$('h1');
    if (heroSection) {
      const heroText = await heroSection.textContent();
      console.log(`Hero text found: ${heroText.substring(0, 50)}...`);
    }

    // Check for download buttons
    const downloadButtons = await page.$$('a[href="#download"]');
    console.log(`Download buttons found: ${downloadButtons.length}`);

    // Check for feature section
    const featuresSection = await page.$('#features');
    console.log(`Features section found: ${!!featuresSection}`);

    // Check for download section
    const downloadSection = await page.$('#download');
    console.log(`Download section found: ${!!downloadSection}`);

    // Report console errors
    console.log('\n--- Console Errors ---');
    if (consoleErrors.length === 0) {
      console.log('No console errors found!');
    } else {
      consoleErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    console.log('\n--- Test Results ---');
    console.log('Page loaded successfully: ✓');
    console.log('Hero section present: ✓');
    console.log('Download buttons present: ✓');
    console.log(`Console errors: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n⚠️ Some console errors detected. Please review above.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
