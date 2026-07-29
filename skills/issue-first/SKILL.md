---
name: issue-first
description: Enforces the "every planned unit of work has its own GitHub issue" rule for the Merge Lantern project (haunted-pixel-labs/merge-lantern). Use IMMEDIATELY when about to reference planned work by phrases like "stack N", "next stack", "next up", "queued next", "queued up", "planned work", "the plan is", "next PR", "PR series", "we'll do X next", "coming up", or "after this" — or when discussing multi-PR sequences, upcoming work, or a work plan spanning multiple commits. Blocks the planning statement until an issue exists or Jake explicitly waives the check. Fail-loud: better to over-invoke than to miss a plan-in-context.
---

# issue-first

**Purpose:** Every planned unit of work in the Merge Lantern repo (`haunted-pixel-labs/merge-lantern`) must have its own GitHub issue before it is referenced in output. No exceptions without an explicit Jake waiver in the current turn.

## The failure mode this exists to prevent

Planning a multi-stack sequence in conversation and executing it without filing per-stack issues. The plan lives only in AI context. Jake cannot query "what's next" or prioritise, and the tracker is a lie. Recurrence surfaced 2026-07-27: issue #32 (7-stack plan, only parent existed; stacks 3b/4/5 tracked only in-context).

## Workflow

Run these steps in order. Do NOT proceed past a failed step. Report every step's outcome in the audit block at the end.

### 1. Name the planned unit of work

State the planned work in one short line. Not "next up" — the actual scope (e.g. "send-sample composer + POST /api/onboarding/send-sample route + integration test").

### 2. Check if an issue exists

Run: `gh issue list --repo haunted-pixel-labs/merge-lantern --search "<keywords from step 1>" --state all`

If the planned work is a sub-item of a larger issue, also skim: `gh issue view <parent#> --json body,comments`.

Report: found (with issue number and title) OR not found (with the exact search command run).

### 3a. If the issue exists

Reference it by number in the output. Done.

### 3b. If the issue does NOT exist

STOP. Do not write the planning statement. Instead:

1. Draft the issue body using the shape below (matches issues #227, #228 in this repo).
2. Show Jake the draft and wait for explicit approval on the body.
3. File via `gh issue create --repo haunted-pixel-labs/merge-lantern --title "..." --body "$(cat <<'EOF' ... EOF)"`
4. Note the returned issue number.
5. Reference it by number in the planning statement.

### Issue body shape (Merge Lantern convention)

```
## Problem
[What gap or need drives this piece of work.]

## Why this works safely (if applicable — for behaviour-changing PRs)
[Invariants that stay intact, why an approach is safe.]

## Fix / deliverables
1. [Concrete file/module added or changed]
2. [Test surface added]
3. [Docs updated]
4. [Parent tracker updated, if any]

## Known-rough edges
[What is deferred, ugly, or awaiting follow-up. Link the follow-up issue if one exists.]

## Follow-up references
[Related issues, parent issue, related PRs.]
```

### Escape hatch — waived tracking

If (and only if) Jake has explicitly said within the current turn that this specific piece of work does not need an issue — e.g. "just a one-line typo fix, don't file" — skip steps 2-3b and quote the waiver in the audit block. Silence is NOT approval. "This is small" from me is NOT a waiver.

## Audit block (required output at end)

Emit these exact lines at the end of any turn where the skill fired:

```
issue-first check
  planned work: <one line>
  existing issue: <found #N | not found (search: <command>)>
  action: <referenced #N | filed #N | awaiting body approval | waived by Jake at "<quote>">
```

If the audit block is missing when it should have fired, that is itself a failure. Jake will notice.
