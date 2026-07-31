#!/bin/bash
# issue-first-check: Stop hook that blocks the turn if planning language
# appears in the assistant response without a GitHub issue reference.
# See ~/.claude/skills/issue-first/SKILL.md for the rule.
#
# Fail-open on every unexpected condition (no transcript, wrong CWD,
# hook already fired). Blocks ONLY when: trigger phrase present AND
# no issue reference AND no waiver marker AND no /issue-first audit block.

set -eu
input=$(cat)

# Prevent infinite loops (this hook already fired once this session).
if [ "$(echo "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

# Only fire when CWD is inside the Merge Lantern repo.
case "${PWD:-$(pwd)}" in
  */the_lab/merge-lantern*) ;;
  *) exit 0 ;;
esac

# Locate transcript and extract the last assistant message text.
transcript=$(echo "$input" | jq -r '.transcript_path // empty')
if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
  exit 0
fi

text=$(jq -sr '
  map(select(.type == "assistant")) | .[-1] |
  .message.content[]? | select(.type == "text") | .text
' "$transcript" 2>/dev/null || true)

if [ -z "$text" ]; then
  exit 0
fi

# Trigger phrases (case-insensitive extended regex).
triggers='stack [0-9]+[a-z]*|next stack|next up|queued next|queued up|planned work|the plan is|next pr|pr series|coming up|after this|we.?ll do [a-z]+ next'
if ! echo "$text" | grep -iEq "$triggers"; then
  exit 0
fi

# Allow if the response contains any of:
#   - GitHub issue reference (#<digits>)
#   - Explicit Jake waiver marker from the issue-first skill's audit block
#   - The issue-first audit block itself
if echo "$text" | grep -Eq '#[0-9]+|waived by Jake|issue-first check'; then
  exit 0
fi

# BLOCK.
cat >&2 <<'EOF'
issue-first hook fired: your response contains planning language ("stack N", "next up", "coming up", etc.) but no GitHub issue reference and no /issue-first audit block.

Per the issue-first skill, every planned unit of work in haunted-pixel-labs/merge-lantern needs its own GitHub issue BEFORE being referenced.

Redo your response by doing one of:
  1. Reference the specific existing issue number (e.g. #227)
  2. Invoke /issue-first to walk the workflow (files a new issue if needed)
  3. Get Jake's explicit waiver in this turn and quote it in an audit block

The audit block format is documented at ~/.claude/skills/issue-first/SKILL.md.
EOF
exit 2
