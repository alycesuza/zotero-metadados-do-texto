#!/bin/sh
set -eu
cd "$(dirname "$0")"
npm test
python3 scripts/build.py
version=$(node -p "require('./package.json').version")
git diff --exit-code
git diff --cached --exit-code
test -z "$(git ls-files --others --exclude-standard)"
git tag "v$version"
git push origin "v$version"
