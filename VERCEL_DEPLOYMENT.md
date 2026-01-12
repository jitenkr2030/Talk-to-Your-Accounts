# Vercel Deployment Guide for Talk to Your Accounts Landing Page

## Quick Deployment (Automatic)

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```
   - Enter your email and verify via email link

3. **Deploy the landing page:**
   ```bash
   cd /workspace/landing-page
   vercel --prod
   ```
   - Follow the interactive prompts
   - Your site will be deployed to a URL like: `https://your-project.vercel.app`

### Option 2: Deploy via Vercel Dashboard (GitHub Integration)

1. **Push to GitHub:**
   ```bash
   cd /workspace/landing-page
   git init
   git add .
   git commit -m "Initial landing page commit"
   git remote add origin https://github.com/yourusername/talk-to-accounts.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect settings (no build command needed for static HTML)
   - Click "Deploy"

### Option 3: Deploy via Vercel Dashboard (Drag & Drop)

1. Go to [vercel.com/drop](https://vercel.com/drop)
2. Drag and drop the `landing-page` folder
3. Your site will be deployed instantly

## Manual Deployment Instructions

### Step 1: Prepare Files

Ensure your landing page folder contains:
```
landing-page/
├── index.html
├── vercel.json
└── downloads/
    ├── windows/
    │   └── talk-to-accounts-installer.exe
    ├── mac/
    │   └── talk-to-accounts-installer.dmg
    └── linux/
        └── talk-to-accounts-installer.deb
```

### Step 2: Deploy via Dashboard

1. Visit [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Select "From Drop" or "From GitHub"
4. Follow the prompts to complete deployment

### Step 3: Configure Custom Domain (Optional)

1. In Vercel Dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Testing the Deployment

After deployment, verify:

✅ **Homepage loads correctly**
```bash
curl -I https://your-deployment-url.vercel.app
```

✅ **Download buttons work**
- Test clicking each platform's download button
- Verify files download correctly

✅ **Mobile responsiveness**
- Test on different screen sizes
- Check all features work on mobile

## Post-Deployment Checklist

- [ ] Test all download links
- [ ] Verify mobile responsiveness
- [ ] Check page load speed (aim for <3s)
- [ ] Test in multiple browsers
- [ ] Set up analytics (Google Analytics, etc.)
- [ ] Configure custom domain (if applicable)
- [ ] Set up SSL certificate (automatic with Vercel)
- [ ] Create 404 page (optional)

## Troubleshooting

### Download Files Not Accessible
Ensure download files are in the correct directory structure:
- `/downloads/windows/filename.exe`
- `/downloads/mac/filename.dmg`
- `/downloads/linux/filename.deb`

### CORS Issues
The `vercel.json` includes proper headers for download files. If you encounter issues, verify the configuration.

### Build Errors
For static HTML sites, no build command is needed. If you see build errors:
1. Ensure no syntax errors in HTML
2. Verify all file paths are correct
3. Check browser console for JavaScript errors

## Environment Variables (Optional)

If you need environment variables for analytics or API calls:

1. In Vercel Dashboard → Settings → Environment Variables
2. Add variables:
   - `ANALYTICS_ID`: Your analytics tracking ID
   - `API_ENDPOINT`: Your backend API URL
3. Access in JavaScript: `process.env.ANALYTICS_ID`

## Performance Optimization

The Vercel configuration includes:
- Gzip compression (automatic)
- Static file caching
- CDN distribution
- Edge network caching

For optimal performance:
- Optimize images before uploading
- Minify CSS/JS (optional for small sites)
- Use SVG icons (already implemented)
- Compress download files

## Security Headers

The `vercel.json` configures:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Disposition: attachment for downloads

## Support

- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Community Forum: https://github.com/vercel/vercel/discussions

## Next Steps

1. Deploy to Vercel using one of the methods above
2. Test all functionality
3. Set up custom domain (if needed)
4. Configure analytics
5. Monitor performance in Vercel Dashboard
6. Update download files with actual installers when ready
