const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright test...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  try {
    // Navigate to the app
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for the app to load
    await page.waitForTimeout(3000);
    
    // Check if the page loaded successfully
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for root element
    const rootElement = await page.$('#root');
    if (rootElement) {
      console.log('✓ Root element found');
    } else {
      console.log('✗ Root element not found');
    }
    
    // Check for any visible content
    const bodyText = await page.textContent('body');
    if (bodyText && bodyText.length > 0) {
      console.log('✓ Page has content');
      console.log('Content preview:', bodyText.substring(0, 200));
    } else {
      console.log('✗ Page is empty');
    }
    
    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('✓ No console errors');
    }
    
    console.log('\n✓ Application loaded successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
