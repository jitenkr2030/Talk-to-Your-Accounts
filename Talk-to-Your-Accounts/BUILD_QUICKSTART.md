# Automated Build System - Quick Start Guide

## What Has Been Set Up

This guide summarizes the automated build system that has been configured for your "Talk to Your Accounts" Electron application. When complete, this system will automatically build installers for Windows, macOS, and Linux whenever you create a release on GitHub.

### Files Created/Modified

| File | Purpose |
|------|---------|
| `package.json` | Added electron-builder and build scripts |
| `electron-builder.yml` | Configuration for installer creation |
| `.github/workflows/build.yml` | GitHub Actions workflow for automated builds |
| `electron/main.js` | Updated to support production builds |
| `BUILD_SETUP.md` | Detailed documentation for the build system |

## Immediate Action Required

To make the download buttons on your landing page work, follow these steps:

### Step 1: Add GitHub Token Secret

1. Go to https://github.com/settings/tokens
2. Generate a new classic token with `repo` scope
3. Copy the token value
4. Go to your repository → Settings → Secrets and variables → Actions
5. Create a new secret named `GITHUB_TOKEN`
6. Paste your token and save

### Step 2: Push the Configuration

```bash
cd /workspace/talk-to-your-accounts
git add .
git commit -m "Add automated build configuration"
git push origin main
```

### Step 3: Create Your First Release

1. Go to your GitHub repository
2. Click "Releases" → "Draft a new release"
3. Tag version: `v1.0.0`
4. Title: "Talk to Your Accounts v1.0.0"
5. Description: Add release notes
6. Click "Publish release"

The build will start automatically. Once complete (15-20 minutes), the installers will be available on the release page.

## How It Works

### The User Flow

After setup is complete, users will experience this flow:

1. User visits your landing page at talk-to-your-accounts.vercel.app
2. User clicks "Download Free" or selects their platform (Windows/macOS/Linux)
3. Browser downloads the appropriate installer file
4. User runs the installer and uses the application

### Technical Flow

1. You create a GitHub release with a version tag
2. GitHub Actions triggers the build workflow
3. The workflow:
   - Checks code quality
   - Builds React application
   - Packages with Electron
   - Creates platform-specific installers
   - Uploads to GitHub Releases
4. Landing page download buttons automatically link to these files

## Testing Locally

Before pushing to GitHub, test the build on your machine:

```bash
# Install dependencies
npm install

# Build React app
npm run build

# Build all installers
npm run build:electron

# Or build for specific platform
npm run build:win    # Windows .exe
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux .deb and .AppImage
```

Built installers will appear in the `dist/` directory.

## Icon Requirements

For professional-looking installers, you'll want proper icons:

- **Windows**: `icon.png` (256x256 PNG)
- **macOS**: `icon.icns` (1024x1024 ICNS)
- **Linux**: `icon.png` (256x256 PNG)

Place these in the `public/` directory. The current build uses the favicon.svg as a placeholder.

## Troubleshooting

### "Cannot find module 'electron-builder'"

Run: `npm install`

### Build fails on GitHub Actions

Check the workflow logs for specific error messages. Common issues:
- Missing `GITHUB_TOKEN` secret
- Out of memory (reduce build parallelism)
- Network timeouts (retry the workflow)

### Download buttons still not working

Verify that:
1. A release was published (not just drafted)
2. The release has assets attached
3. The GitHub token has `repo` scope

## Next Steps

1. Add your GitHub token as a secret
2. Push the configuration to GitHub
3. Create your first release
4. Wait 15-20 minutes for builds to complete
5. Verify installers are attached to the release
6. Test downloading and installing on each platform

## Support Resources

- electron-builder documentation: https://www.electron.build/
- GitHub Actions documentation: https://docs.github.com/en/actions
- Your build setup documentation: See `BUILD_SETUP.md`
