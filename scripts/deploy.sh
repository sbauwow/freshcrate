#!/bin/bash

# freshcrate deploy script
# Pushes code changes to GitHub; runtime DB lives outside git.
# Railway auto-redeploys on push.
#
# Usage: bash scripts/deploy.sh

set -e

echo "🔧 freshcrate deploy pipeline"
echo ""

# 1. Optional local refresh (does not commit DB)
echo "📦 Step 1: Optional local database refresh..."
railway run node scripts/populate.mjs --clear || true
echo ""

# 2. Commit code/config only
echo "📝 Step 2: Committing..."
git add -A
git commit -m "deploy: latest changes $(date '+%Y-%m-%d %H:%M')"
echo ""

# 4. Push — Railway auto-redeploys
echo "🚀 Step 4: Pushing to GitHub..."
git push origin main
echo ""

echo "✅ Done! Railway is deploying now."
echo "   Check status at: https://railway.app"
