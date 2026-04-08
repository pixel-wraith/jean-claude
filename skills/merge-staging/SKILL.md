---
name: merge-staging
description: Fetch and merge the latest changes from the remote staging branch into the current branch, resolve merge conflicts, and push. Use when user wants to pull in staging, sync with staging, merge staging, or update their branch from staging.
allowed-tools: Bash(git *), Read, Grep
---

## Pre-flight Checks

1. Run `git status` to confirm there are no uncommitted changes. If there are, ask whether to commit or stash them before proceeding.
2. Identify the current branch: `git branch --show-current`. If already on `staging`, stop and inform the user.

## Fetch and Merge

1. Fetch the latest from origin: `git fetch origin staging`
2. Merge staging into the current branch: `git merge origin/staging`
3. If the merge completes cleanly, skip to **Push**.

## Resolve Merge Conflicts

If the merge produces conflicts:

1. List conflicted files: `git diff --name-only --diff-filter=U`
2. For each conflicted file:
   - Read the file and examine each conflict block (`<<<<<<<` / `=======` / `>>>>>>>`)
   - Analyze both sides in the context of the surrounding code to determine the correct resolution
   - If the resolution is obvious (e.g., one side is strictly additive, formatting-only, or a clear superset), resolve it
   - If the resolution is ambiguous or could change behavior in a non-obvious way, show the conflict to the user and ask how to proceed
3. After resolving all conflicts, stage the resolved files: `git add <file>`
4. Complete the merge: `git commit --no-edit`

## Push

1. Push the result: `git push`
2. If the push fails because the remote is ahead, inform the user rather than force-pushing.
