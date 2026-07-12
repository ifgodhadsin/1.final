#!/bin/bash
# setup.sh - Run this once to configure GitHub secrets for auto-deployment

echo "═══════════════════════════════════════════════════"
echo "  TransitOps GitHub Secrets Setup"
echo "═══════════════════════════════════════════════════"
echo ""
echo "This script helps you configure GitHub secrets for"
echo "automatic Vercel deployment on every push."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Install it first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub. Run: gh auth login"
    exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ -z "$REPO" ]; then
    echo "❌ Could not detect GitHub repo. Make sure you're in a git repo."
    exit 1
fi

echo "✓ Detected repo: $REPO"
echo ""

# Vercel Token
echo "───────────────────────────────────────────────────"
echo "1. VERCEL_TOKEN"
echo "───────────────────────────────────────────────────"
echo "Get your token from: https://vercel.com/account/tokens"
echo ""
read -sp "Paste Vercel token: " VERCEL_TOKEN
echo ""

# Vercel Org ID
echo ""
echo "───────────────────────────────────────────────────"
echo "2. VERCEL_ORG_ID"
echo "───────────────────────────────────────────────────"
echo "Get this from your Vercel project settings"
echo "Or run: vercel teams list"
echo ""
read -p "Paste Vercel Org ID: " VERCEL_ORG_ID

# Vercel Project ID
echo ""
echo "───────────────────────────────────────────────────"
echo "3. VERCEL_PROJECT_ID"
echo "───────────────────────────────────────────────────"
echo "Get this from your Vercel project settings"
echo "Or run: vercel project list"
echo ""
read -p "Paste Vercel Project ID: " VERCEL_PROJECT_ID

# Database URL
echo ""
echo "───────────────────────────────────────────────────"
echo "4. DATABASE_URL"
echo "───────────────────────────────────────────────────"
echo "Your PostgreSQL connection string"
echo "Example: postgresql://user:pass@host:5432/db"
echo ""
read -sp "Paste DATABASE_URL: " DATABASE_URL
echo ""

# Set secrets
echo ""
echo "───────────────────────────────────────────────────"
echo "Setting GitHub secrets..."
echo "───────────────────────────────────────────────────"

echo "$VERCEL_TOKEN" | gh secret set VERCEL_TOKEN --repo "$REPO" --body "$VERCEL_TOKEN"
echo "$VERCEL_ORG_ID" | gh secret set VERCEL_ORG_ID --repo "$REPO" --body "$VERCEL_ORG_ID"
echo "$VERCEL_PROJECT_ID" | gh secret set VERCEL_PROJECT_ID --repo "$REPO" --body "$VERCEL_PROJECT_ID"
echo "$DATABASE_URL" | gh secret set DATABASE_URL --repo "$REPO" --body "$DATABASE_URL"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ All secrets configured!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Push code to GitHub: git push origin main"
echo "  2. GitHub Actions will auto-deploy to Vercel"
echo "  3. Check progress at: https://github.com/$REPO/actions"
echo ""
