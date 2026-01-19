# Talk to Your Accounts - Landing Page

A professional marketing site for the Talk to Your Accounts Electron desktop application. This landing page is designed to showcase the app's features and provide direct download links for Windows, macOS, and Linux.

## 🌟 Features

- **Hero Section**: Eye-catching headline with "Accounting at the Speed of Voice" messaging
- **Feature Showcase**: 9 key features with icons and descriptions
- **Smart Download Section**: Auto-detects latest release from GitHub and provides platform-specific download links
- **Responsive Design**: Works perfectly on mobile, tablet, and desktop
- **Dark Footer**: Professional footer with links and social icons
- **GitHub Integration**: Dynamically fetches the latest release version and download URLs

## 🚀 Quick Start

### Development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## 📦 Deployment to Vercel

### Option 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --yes
```

### Option 2: Vercel Dashboard (GitHub Integration)

1. Go to [Vercel New Project](https://vercel.com/new)
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (or your landing page directory)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Click "Deploy"

### Environment Variables

No environment variables required for the landing page. The GitHub API is public and doesn't require authentication for rate-limited requests.

## 📁 Project Structure

```
talk-to-your-accounts-landing/
├── components/          # React components
├── pages/              # Next.js pages
│   ├── _app.js        # App wrapper
│   └── index.js       # Main landing page
├── public/            # Static assets
├── styles/            # Global styles
│   └── globals.css    # Tailwind + custom CSS
├── vercel.json        # Vercel configuration
├── tailwind.config.js # Tailwind configuration
├── next.config.js     # Next.js configuration
└── package.json
```

## 🎨 Design Highlights

- **Color Scheme**: Primary blue (`#2563EB`) for trust/business, accent violet (`#7C3AED`) for AI features
- **Typography**: Inter font for clean, modern appearance
- **Animations**: Smooth hover effects, fade-in animations
- **Glass Effects**: Frosted glass navigation with blur backdrop

## 🔗 GitHub Release Integration

The landing page automatically fetches the latest release from:
`https://api.github.com/repos/jitenkr2030/Talk-to-Your-Accounts/releases/latest`

To enable download links, create a GitHub Release with:
- `.exe` file for Windows
- `.dmg` file for macOS
- `.deb` file for Debian/Ubuntu
- `.AppImage` file for other Linux distributions

## 📱 Sections

1. **Hero**: Main value proposition with call-to-action
2. **Features Grid**: 9 feature cards showcasing app capabilities
3. **Download Hub**: Platform-specific download buttons
4. **CTA Section**: Final call-to-action
5. **Footer**: Links, social icons, copyright

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: CSS custom animations
- **Deployment**: Vercel

## 📄 License

MIT License - See the main repository for details.

---

Built with ❤️ for small business owners everywhere.
