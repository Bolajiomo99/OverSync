#!/usr/bin/env bash
# Vercel build script for the OverSync monorepo.
#
# Why a script: Vercel's `buildCommand` is capped at 256 characters and
# we need to (a) install workspace deps, (b) build the @oversync/sdk
# package before the frontend (so the workspace symlink resolves
# correctly), (c) build the frontend, and (d) mirror the resulting
# `dist/` into `frontend/dist/` so that the deployment is robust to
# whichever Root Directory the Vercel dashboard ends up pointing at.
#
# Keep this file shell-only — Vercel runs it before Node tooling
# beyond what is installed by the script itself is guaranteed to be
# available.
set -euo pipefail

echo "==> Installing dependencies"
pnpm install --no-frozen-lockfile

echo "==> Building @oversync/sdk"
pnpm --filter @oversync/sdk build

echo "==> Building @oversync/frontend"
pnpm --filter @oversync/frontend build

echo "==> Mirroring dist/ into frontend/dist/"
mkdir -p frontend/dist
cp -r dist/. frontend/dist/

echo "==> Build output verification"
echo "--- dist contents ---"
ls -la dist/
echo "--- frontend/dist contents ---"
ls -la frontend/dist/
