#!/bin/bash
# Test script to verify the build configuration for Talk to Your Accounts

echo "=== Checking Build Configuration ==="
echo ""

# Check if package.json exists and has correct dependencies
echo "1. Checking package.json..."
if [ -f "package.json" ]; then
    echo "   ✓ package.json found"
    
    # Check Electron version
    ELECTRON_VERSION=$(grep '"electron"' package.json | grep -oP '"\^?\d+\.\d+\.\d+"' | tr -d '"^')
    echo "   ✓ Electron version: $ELECTRON_VERSION"
    
    # Check better-sqlite3 version
    SQLITE_VERSION=$(grep '"better-sqlite3"' package.json | grep -oP '"\^?\d+\.\d+\.\d+"' | tr -d '"^')
    echo "   ✓ better-sqlite3 version: $SQLITE_VERSION"
    
    # Check if electron-builder is present
    if grep -q '"electron-builder"' package.json; then
        echo "   ✓ electron-builder is present"
    else
        echo "   ✗ electron-builder missing"
    fi
else
    echo "   ✗ package.json not found"
fi

echo ""

# Check if electron-builder.yml exists
echo "2. Checking electron-builder.yml..."
if [ -f "electron-builder.yml" ]; then
    echo "   ✓ electron-builder.yml found"
    
    # Check if icon is defined (common source of errors)
    if grep -q 'icon:' electron-builder.yml; then
        echo "   ⚠ Icon defined - ensure it's .ico for Windows"
    else
        echo "   ✓ No icon defined (good for cross-platform)"
    fi
else
    echo "   ✗ electron-builder.yml not found"
fi

echo ""

# Check workflow file
echo "3. Checking GitHub workflow..."
WORKFLOW_FILE=".github/workflows/build.yml"
if [ -f "$WORKFLOW_FILE" ]; then
    echo "   ✓ Workflow file found"
    
    # Check if macOS build is disabled
    if ! grep -q 'macos' "$WORKFLOW_FILE"; then
        echo "   ✓ macOS build is disabled (per user request)"
    else
        echo "   ⚠ macOS build found in workflow"
    fi
    
    # Check if native Windows runner is used
    if grep -q 'windows-2019' "$WORKFLOW_FILE"; then
        echo "   ✓ Windows native runner configured"
    fi
    
    # Check if native Linux runner is used
    if grep -q 'ubuntu-20.04' "$WORKFLOW_FILE"; then
        echo "   ✓ Linux native runner configured"
    fi
    
    # Check permissions
    if grep -q 'contents: write' "$WORKFLOW_FILE"; then
        echo "   ✓ Permissions configured for release upload"
    fi
else
    echo "   ✗ Workflow file not found"
fi

echo ""

# Check if dist folder exists (from previous builds)
echo "4. Checking build output directory..."
if [ -d "dist" ]; then
    echo "   ✓ dist directory exists"
    echo "   Contents:"
    ls -la dist/ 2>/dev/null | head -10 || echo "   (empty or inaccessible)"
else
    echo "   ○ dist directory not found (expected for fresh checkout)"
fi

echo ""

# Check node_modules (optional - might not be installed)
echo "5. Checking node_modules..."
if [ -d "node_modules" ]; then
    echo "   ✓ node_modules installed"
    
    # Check if better-sqlite3 is installed
    if [ -d "node_modules/better-sqlite3" ]; then
        echo "   ✓ better-sqlite3 is installed"
    else
        echo "   ✗ better-sqlite3 not found in node_modules"
    fi
else
    echo "   ○ node_modules not installed (run npm install first)"
fi

echo ""
echo "=== Build Configuration Check Complete ==="
echo ""
echo "To start a new build:"
echo "  1. Ensure dependencies are installed: npm install"
echo "  2. Build the React app: npm run build"
echo "  3. Create a release on GitHub to trigger the workflow"
