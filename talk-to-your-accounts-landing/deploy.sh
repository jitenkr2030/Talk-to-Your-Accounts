#!/bin/bash

# Deploy script for Talk to Your Accounts Landing Page
# This script builds and deploys the landing page to Vercel

echo "🚀 Deploying Talk to Your Accounts Landing Page..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "🔨 Building the Next.js project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "To deploy manually:"
echo "1. Run: npx vercel login"
echo "2. Run: npx vercel --yes"
echo ""
echo "Or connect your GitHub repository to Vercel at:"
echo "https://vercel.com/new"
