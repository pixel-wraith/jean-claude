---
name: sync-tooling
description: Verifies and repairs sync between the jean-claude source-of-truth repo (~/the_lab/jean-claude/) and the active Claude install (~/.claude/). Covers skills, agents, and settings.json. Use IMMEDIATELY after creating or editing any skill, agent, or hook — via /create-skill, /update-config, or a direct file edit to either location. Also use when Jake asks to verify sync, check drift, or "sync tooling." Fail-loud: report every drift found; do not silently ignore missing files.
---

# sync-tooling

**Purpose:** Jean-claude (`~/the_lab/jean-claude/`) is the git-tracked source of truth for Jake's Claude tooling (skills, agents, hooks/settings). The active install at `~/.claude/` is a plain copy. This skill enforces that the two stay identical after any change.

## The failure mode this exists to prevent

Editing a skill or hook in one location and forgetting the other, so jean-claude drifts out of sync. A new machine or teammate picks up jean-claude and misses the recent change. Skill/hook works on Jake's laptop but not on the next one. Recurrence documented 2026-07-27: current drift includes `create-github-issue`, `grill-me`, `resolve-pr-feedback`, `review-pr`, `review-pr-feedback` present in `~/.claude/skills/` but missing from jean-claude; `merge-staging`, `write-a-prd` in jean-claude but not installed.

## Workflow

Run these steps in order. Report every step in the audit block at the end.

### 1. Compare skills

`diff -rq ~/.claude/skills ~/the_lab/jean-claude/skills`

Report: identical / drift (with file names) / one-sided (present in only one location).

### 2. Compare agents

`diff -rq ~/.claude/agents ~/the_lab/jean-claude/agents 2>/dev/null || echo "one of the agent dirs may not exist yet"`

Same reporting shape as step 1.

### 2b. Compare hooks scripts

`diff -rq ~/.claude/hooks ~/the_lab/jean-claude/hooks 2>/dev/null || echo "one of the hooks dirs may not exist yet"`

Same reporting shape as steps 1 and 2. Hook script drift is high-priority — a script that lives in `~/.claude/hooks/` but not jean-claude won't survive a new-machine setup, and the hook's `settings.json` entry references a path that won't exist on the new machine (silent failure).

### 3. Compare settings.json

`diff ~/.claude/settings.json ~/the_lab/jean-claude/settings.json`

Note: `settings.json` can legitimately diverge in some fields (machine-specific config, API keys). Do NOT auto-reconcile the whole file. Report the diff and let Jake decide field-by-field which side wins.

### 4. Report drift and propose the fix

For each drift found:
- Show the diff (or list the one-sided files).
- State the assumed direction: **jean-claude is source of truth by default** → active copy at `~/.claude/` gets overwritten from jean-claude.
- If the change originated in `~/.claude/` (just authored, not yet mirrored to jean-claude), the direction is reversed.
- Wait for Jake's approval on direction before copying. Do NOT overwrite without explicit approval.

### 5. Copy on approval

`cp -r <src>/<name>/ <target>/<name>/`

### 6. Prompt Jake to commit to jean-claude

If anything flowed INTO jean-claude:

`cd ~/the_lab/jean-claude && git status`

If working tree has changes, remind Jake to commit + push. Do NOT auto-commit — jean-claude is Jake's git-tracked artifact and he owns the commit message.

## Audit block (required output at end)

```
sync-tooling check
  skills:      <in sync | drift: <list>>
  agents:      <in sync | drift: <list>>
  hooks:       <in sync | drift: <list>>
  settings:    <in sync | drift: <line count>>
  action:      <no changes needed | copied <list> <src>→<target> | awaiting Jake approval on <list>>
  jean-claude git status: <clean | uncommitted changes (Jake should commit)>
```

If the audit block is missing when the skill fired, that is a failure. Jake will notice.
