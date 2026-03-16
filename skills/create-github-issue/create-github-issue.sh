#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <owner/repo> <title> <body>" >&2
  exit 1
fi

REPO="$1"
TITLE="$2"
BODY="$3"

if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI (gh) is not installed." >&2
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Error: Not authenticated with GitHub CLI. Run 'gh auth login' first." >&2
  exit 1
fi

RESULT=$(gh issue create --repo "$REPO" --title "$TITLE" --body "$BODY" 2>&1)

if [[ $? -eq 0 ]]; then
  echo "Issue created successfully: ${RESULT}"
else
  echo "Error creating issue:" >&2
  echo "$RESULT" >&2
  exit 1
fi
