# Talk to Your Accounts - Automated Build Setup

This document explains how to set up and use the automated build system for creating installers across Windows, macOS, and Linux platforms.

## Overview

The project uses GitHub Actions to automatically build installers whenever a new release is created. The workflow builds three separate installers:

- **Windows**: `.exe` installer (NSIS format)
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` and `.deb` packages

## Prerequisites

Before setting up automated builds, ensure you have:

1. A GitHub account with push access to the repository
2. Git installed locally
3. Node.js version 20 or higher
4. A GitHub Personal Access Token (for publishing releases)

## Initial Setup Steps

### Step 1: Generate a GitHub Personal Access Token

To allow GitHub Actions to upload release artifacts, you need a Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "Electron Builder Token"
4. Select the following scopes:
   - `repo` (Full control of private repositories)
5. Click "Generate token" and copy the token value

### Step 2: Add the Token to Your Repository

1. Go to your GitHub repository settings
2. Navigate to "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `GITHUB_TOKEN`
5. Value: Paste your Personal Access Token
6. Click "Add secret"

### Step 3: Push the Configuration Files

The following files have been created or updated in your repository:

- `package.json` - Added electron-builder and build scripts
- `electron-builder.yml` - Configuration for installer creation
- `.github/workflows/build.yml` - GitHub Actions workflow
- `electron/main.js` - Updated to support production builds

Push these changes to GitHub:

```bash
git add .
git commit -m "Add automated build configuration"
git push origin main
```

### Step 4: Create Your First Release

To trigger the automated build, create a GitHub release:

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Choose a tag version (e.g., `v1.0.0`)
4. Release title: "Talk to Your Accounts v1.0.0"
5. Description: Add release notes describing what's new
6. Check "This is a pre-release" if appropriate
7. Click "Publish release"

The GitHub Actions workflow will automatically start building installers for all platforms.

## How the Build Process Works

### Workflow Triggers

The build workflow runs automatically in these scenarios:

1. **On Release Creation**: When you publish a new release, all three platforms are built and installers are uploaded to the release
2. **On Main Branch Push**: When code is pushed to the main branch that affects the application (src/, electron/, package.json, etc.), a quality check runs

### Build Jobs

The workflow consists of several jobs:

1. **Quality Check**: Verifies the code builds correctly
2. **Build Windows**: Creates the Windows installer
3. **Build macOS**: Creates installers for both Intel (x64) and Apple Silicon (arm64)
4. **Build Linux**: Creates both AppImage and Debian packages
5. **Create Release**: Collects all installers and creates the GitHub release

### Build Duration

The complete build process typically takes:

- Windows: 5-10 minutes
- macOS: 10-15 minutes
- Linux: 5-8 minutes

Total time: Approximately 15-20 minutes for all platforms.

## Testing the Build Locally

Before pushing to GitHub, you can test the build locally:

### Install Dependencies

```bash
npm install
```

### Build the React Application

```bash
npm run build
```

### Build Installers

```bash
# Build for all platforms
npm run build:electron

# Build for specific platform only
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

The built installers will be in the `dist/` directory.

## Installation Instructions for Users

Once the release is published, users can download installers from the releases page:

### Windows

1. Download `Talk-to-Your-Accounts-Setup-1.0.0.exe`
2. Run the installer
3. Follow the installation wizard
4. The application will be installed to `C:\Program Files\Talk to Your Accounts`
5. A desktop shortcut will be created

### macOS

1. Download `Talk-to-Your-Accounts-1.0.0.dmg`
2. Open the `.dmg` file
3. Drag "Talk to Your Accounts" to your Applications folder
4. Eject the disk image
5. Launch from Applications or Dock

### Linux (AppImage)

1. Download `Talk-to-Your-Accounts-1.0.0.AppImage`
2. Make it executable:
   ```bash
   chmod +x Talk-to-Your-Accounts-1.0.0.AppImage
   ```
3. Run the application:
   ```bash
   ./Talk-to-Your-Accounts-1.0.0.AppImage
   ```

### Linux (Debian/Ubuntu)

1. Download `Talk-to-Your-Accounts-1.0.0.deb`
2. Install using:
   ```bash
   sudo dpkg -i Talk-to-Your-Accounts-1.0.0.deb
   sudo apt-get install -f  # Fix any dependency issues
   ```
3. Launch from application menu

## Configuration Options

### Customizing the Build

Edit `electron-builder.yml` to customize the build:

```yaml
# Change the application ID
appId: com.yourcompany.app

# Change the display name
productName: Your App Name

# Customize Windows installer
win:
  target: nsis
  icon: path/to/icon.png

# Customize macOS options
mac:
  target: dmg
  icon: path/to/icon.icns

# Customize Linux options
linux:
  target:
    - AppImage
    - deb
```

### Environment Variables for GitHub Actions

You can add these secrets to GitHub for enhanced functionality:

| Secret Name | Description |
|------------|-------------|
| `GITHUB_TOKEN` | Required for uploading releases |
| `WIN_CERTIFICATE_BASE64` | Base64-encoded code signing certificate (optional) |
| `WIN_CERTIFICATE_PASSWORD` | Password for the certificate (optional) |
| `APPLE_ID` | Apple ID for notarization (optional) |
| `APPLE_ID_PASSWORD` | App-specific password for Apple ID (optional) |
| `APPLE_TEAM_ID` | Team ID for Apple Developer account (optional) |

## Troubleshooting

### Build Fails with "Cannot find module"

Ensure all dependencies are installed:
```bash
npm install
```

### Windows Build Issues

- Ensure you're running on Windows Server 2019 or Windows 10/11
- Install Windows Build Tools if needed:
  ```bash
  npm install --global windows-build-tools
  ```

### macOS Build Issues

- For code signing, you need an Apple Developer account
- Set up keychain access for code signing in the workflow

### Linux Build Issues

- Ensure all required dependencies are listed in the `deb.depends` section
- The AppImage build requires `appimagetool` which is installed automatically

### Release Assets Not Appearing

1. Check that the workflow completed successfully
2. Verify `GITHUB_TOKEN` is set as a repository secret
3. Check the workflow logs for specific errors

## Updating the Application

To release a new version:

1. Update the version in `package.json`:
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. Commit and push the changes:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.1.0"
   git push origin main
   ```

3. Create a new release on GitHub with the new version tag (e.g., `v1.1.0`)

4. The workflow will automatically build and upload the new installers

## Support

If you encounter issues with the build process:

1. Check the GitHub Actions workflow logs
2. Review the electron-builder documentation: https://www.electron.build/
3. Search existing GitHub issues

## License

This project is open source under the MIT License.
