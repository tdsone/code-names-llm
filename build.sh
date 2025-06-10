#!/usr/bin/env bash
set -e

cd frontend
npm ci
npm run build

cd ../backend
npm ci
npm run build