#!/bin/bash
# deploy.sh - Manual deployment script (fallback if GitHub Actions fails)

echo "═══════════════════════════════════════════════════"
echo "  TransitOps Manual Deploy"
echo "═══════════════════════════════════════════════════"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel@latest
fi

echo ""
echo "Building and deploying..."
vercel --prod

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Deployed!"
echo "═══════════════════════════════════════════════════"
