#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

cd frontend
npm install
npm list --depth=0

npm run build
cd ../backend
npm install
npm run build