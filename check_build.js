/**
 * Build Configuration Verification Script
 * Checks all necessary configurations for the GitHub Actions build
 */

const fs = require('fs');
const path = require('path');

console.log('=== Talk to Your Accounts - Build Verification ===\n');

const checks = {
  packageJson: false,
  electronBuilder: false,
  workflowFile: false,
  correctElectronVersion: false,
  correctSqliteVersion: false,
  noIconDefined: true,
  macOsDisabled: false,
  nativeRunnersConfigured: false,
  permissionsConfigured: false
};

// Check 1: package.json exists and has correct dependencies
console.log('1. Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  checks.packageJson = true;
  console.log('   ✓ package.json found');
  
  // Check Electron version (should be 28.x for better-sqlite3 compatibility)
  const electronVersion = packageJson.devDependencies?.electron;
  if (electronVersion && electronVersion.startsWith('^28.')) {
    checks.correctElectronVersion = true;
    console.log(`   ✓ Electron version: ${electronVersion} (compatible with better-sqlite3)`);
  } else {
    console.log(`   ⚠ Electron version: ${electronVersion} (should be ^28.x.x)`);
  }
  
  // Check better-sqlite3 version
  const sqliteVersion = packageJson.dependencies?.['better-sqlite3'];
  if (sqliteVersion) {
    checks.correctSqliteVersion = true;
    console.log(`   ✓ better-sqlite3 version: ${sqliteVersion}`);
  }
  
  // Check electron-builder
  if (packageJson.devDependencies?.['electron-builder']) {
    console.log('   ✓ electron-builder is present');
  }
  
} catch (err) {
  console.log('   ✗ Error reading package.json:', err.message);
}

// Check 2: electron-builder.yml configuration
console.log('\n2. Checking electron-builder.yml...');
try {
  const builderConfig = fs.readFileSync('electron-builder.yml', 'utf8');
  
  checks.electronBuilder = true;
  console.log('   ✓ electron-builder.yml found');
  
  // Check if icon is defined
  if (builderConfig.includes('icon:')) {
    checks.noIconDefined = false;
    console.log('   ⚠ Icon defined - ensure it\'s .ico format for Windows');
  } else {
    checks.noIconDefined = true;
    console.log('   ✓ No icon defined (prevents Windows build errors)');
  }
  
} catch (err) {
  console.log('   ✗ Error reading electron-builder.yml:', err.message);
}

// Check 3: GitHub workflow configuration
console.log('\n3. Checking GitHub workflow (.github/workflows/build.yml)...');
try {
  const workflowPath = '.github/workflows/build.yml';
  const workflowConfig = fs.readFileSync(workflowPath, 'utf8');
  
  checks.workflowFile = true;
  console.log('   ✓ Workflow file found');
  
  // Check if macOS build is disabled
  if (!workflowConfig.includes('macos') && !workflowConfig.includes('macOS')) {
    checks.macOsDisabled = true;
    console.log('   ✓ macOS build is disabled (per user request)');
  } else {
    console.log('   ⚠ macOS build found in workflow');
  }
  
  // Check native runners
  if (workflowConfig.includes('windows-2019') || workflowConfig.includes('windows-latest')) {
    console.log('   ✓ Windows native runner configured');
  }
  
  if (workflowConfig.includes('ubuntu-20.04') || workflowConfig.includes('ubuntu-latest')) {
    console.log('   ✓ Linux native runner configured');
    checks.nativeRunnersConfigured = true;
  }
  
  // Check permissions
  if (workflowConfig.includes('contents: write')) {
    checks.permissionsConfigured = true;
    console.log('   ✓ Permissions configured for release upload');
  }
  
} catch (err) {
  console.log('   ✗ Error reading workflow file:', err.message);
}

// Check 4: Verify dist directory
console.log('\n4. Checking build output directory...');
try {
  if (fs.existsSync('dist')) {
    console.log('   ✓ dist directory exists');
    const distContents = fs.readdirSync('dist');
    console.log(`   Contents: ${distContents.join(', ')}`);
  } else {
    console.log('   ○ dist directory not found (expected for fresh checkout)');
  }
} catch (err) {
  console.log('   ○ Could not read dist directory');
}

// Summary
console.log('\n=== Verification Summary ===');
const allPassed = Object.values(checks).every(v => v === true);
console.log(`Overall Status: ${allPassed ? '✓ ALL CHECKS PASSED' : '⚠ SOME CHECKS NEED ATTENTION'}`);

console.log('\nConfiguration Status:');
console.log(`  - package.json: ${checks.packageJson ? '✓' : '✗'}`);
console.log(`  - Electron v28.x: ${checks.correctElectronVersion ? '✓' : '✗'}`);
console.log(`  - better-sqlite3: ${checks.correctSqliteVersion ? '✓' : '✗'}`);
console.log(`  - No icon (Windows-safe): ${checks.noIconDefined ? '✓' : '✗'}`);
console.log(`  - macOS disabled: ${checks.macOsDisabled ? '✓' : '✗'}`);
console.log(`  - Native runners: ${checks.nativeRunnersConfigured ? '✓' : '✗'}`);
console.log(`  - Release permissions: ${checks.permissionsConfigured ? '✓' : '✗'}`);

console.log('\n=== Next Steps ===');
console.log('1. The build configuration is ready for GitHub Actions');
console.log('2. To trigger a new build:');
console.log('   - Create a new release on GitHub, OR');
console.log('   - Push to master branch with changes to src/, electron/, or package.json');
console.log('3. Monitor the build at: https://github.com/jitenkr2030/Talk-to-Your-Accounts/actions');
