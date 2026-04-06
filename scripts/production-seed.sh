#!/bin/bash
# freshcrate production seed — run once on a fresh deployment
# Usage: GITHUB_TOKEN=<token> bash scripts/production-seed.sh
#
# This script:
#   1. Runs all database migrations
#   2. Populates from GitHub search queries (365+ packages)
#   3. Seeds landmark projects (AutoGPT, langchain, ollama, etc.)
#   4. Polls watched topics for additional packages
#   5. Backfills release history for top 200 packages
#   6. Builds the Next.js app
#
# Requires: GITHUB_TOKEN with public repo access
# Takes: ~15 minutes (mostly GitHub API calls)

set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN is required. Set it with:"
  echo "   export GITHUB_TOKEN=ghp_your_token_here"
  echo "   Or: GITHUB_TOKEN=\$(gh auth token) bash scripts/production-seed.sh"
  exit 1
fi

echo ""
echo "🚀 freshcrate production seed"
echo "═══════════════════════════════════════"
echo ""

# 1. Migrations
echo "📋 Step 1/6: Running migrations..."
node scripts/migrate.mjs

# 2. Populate from search
echo ""
echo "📦 Step 2/6: Populating from GitHub search..."
node scripts/populate.mjs

# 3. Landmark projects
echo ""
echo "🌟 Step 3/6: Seeding landmark projects..."
node scripts/seed-landmarks.mjs

# 4. Topic watch
echo ""
echo "🏷️  Step 4/6: Polling watched topics..."
node scripts/topic-watch.mjs --min-stars 20

# 5. Backfill top 200
echo ""
echo "📜 Step 5/6: Backfilling release history (top 200)..."
node scripts/backfill.mjs --limit 200

# 6. Build
echo ""
echo "🔨 Step 6/6: Building Next.js app..."
npm run build

echo ""
echo "═══════════════════════════════════════"
echo "✅ Production seed complete!"
echo ""
echo "Next steps:"
echo "  npm start                    # start the server"
echo "  npm run apikeys create prod  # create an API key"
echo ""
echo "Cron jobs (add to crontab):"
echo "  0 */6 * * * cd $(pwd) && GITHUB_TOKEN=$GITHUB_TOKEN npm run topics"
echo "  0 3 * * *   cd $(pwd) && GITHUB_TOKEN=$GITHUB_TOKEN npm run monitor"
echo "  0 4 * * 0   cd $(pwd) && GITHUB_TOKEN=$GITHUB_TOKEN npm run backfill --limit 100"
echo ""
