#!/bin/bash

# freshcrate deploy script
# Populates the DB locally with Railway env vars, then pushes to GitHub.
# Railway auto-redeploys on push.
#
# Usage: bash scripts/deploy.sh

set -e

echo "🔧 freshcrate deploy pipeline"
echo ""

# 1. Populate DB
echo "📦 Step 1: Populating database..."
railway run node scripts/populate.mjs --clear
echo ""

# 2. Stage the DB
echo "💾 Step 2: Staging database..."
git add freshcrate.db
echo ""

# 3. Commit everything else too
echo "📝 Step 3: Committing..."
git add -A
git commit -m "deploy: refresh db + latest changes $(date '+%Y-%m-%d %H:%M')"
echo ""

# 4. Push — Railway auto-redeploys
echo "🚀 Step 4: Pushing to GitHub..."
git push origin main
echo ""

echo "✅ Done! Railway is deploying now."
echo "   Check status at: https://railway.app"
