#!/usr/bin/env bash
# PreToolUse hook (Write|Edit): blocks staged copy-paste DRAFTS that violate Jake's voice rules.
# Scope (deliberately narrow to avoid false positives): scratchpad files whose name
# contains "draft" — the draft-staging convention. Internal slip-box notes legitimately
# use em-dashes in their analytical prose, so they are intentionally NOT linted here.
set -u
input=$(cat)
fp=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$fp" ] && exit 0

case "$fp" in
  */scratchpad/*draft*) : ;;   # only staged drafts
  *) exit 0 ;;
esac

content=$(printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty')

viol=""
if printf '%s' "$content" | grep -qF '—'; then
  viol="em-dash detected. Jake's outward-facing writing never uses em-dashes... recast the sentence or use an informal ellipsis."
fi
if printf '%s' "$content" | grep -qE '(\.\.\.|…) '; then
  viol="${viol}${viol:+ | }ellipsis followed by a space detected. Jake writes word...word with NO space after the ellipsis."
fi

if [ -n "$viol" ]; then
  jq -n --arg r "DRAFT LINT BLOCKED: $viol Fix the staged draft, then re-write it." \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
fi
exit 0
