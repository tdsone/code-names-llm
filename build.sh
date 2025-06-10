#!/usr/bin/env bash
set -e

cd frontend
npm ci        # or npm install
npm run build # produces frontend/dist

cd ../backend
npm ci
npm run build

# ─── Copy frontend build into backend/dist/public ────────────────
rm -rf dist/public               # clean old build inside dist/
mkdir -p dist/public
cp -R ../frontend/dist/* dist/public/
# ─────────────────────────────────────────────────────────────────