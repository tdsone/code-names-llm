#!/usr/bin/env bash
set -e

cd frontend
npm ci        # or npm install
npm run build # produces frontend/dist

# ─── Move build to dist/public ───────────────────────────────────
rm -rf ../dist/public           # clean old build
mkdir -p ../dist/public
cp -R dist/* ../dist/public/
# ─────────────────────────────────────────────────────────────────

cd ../backend
npm ci
npm run build