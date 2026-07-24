---
name: create-pr
description: Create a new pull request in GitHub for the current branch.
allowed-tools: Read, Edit, Write, Grep, Bash(gh *), Bash(git *)
---

## Pre-flight Checks

Before creating the PR:
1. Run `git status` to confirm there are no uncommitted changes. If there are, ask me whether to commit or stash them.
2. Run `git log --oneline origin/staging..HEAD` to confirm there are commits to include. If none, stop and inform me.
3. Check if the branch has been pushed: `git rev-parse --abbrev-ref --symbolic-full-name @{u}`. If not pushed, push it first.
4. Check for an existing open PR: `gh pr list --head $(git branch --show-current) --state open`. If one exists, inform me and ask whether to update it instead.

## Gather Change Context

1. Review the commits: `git log --oneline origin/staging..HEAD`
2. Review changed files: `git diff --name-only origin/staging...HEAD`
3. Read the key changed files to understand what was done and why.

## Create the PR

1. Read the PR template at `.github/pull_request_template.md` and use its structure for the PR body.
2. Create the PR against the `staging` branch using `gh pr create`.
3. In the PR summary, provide a concise summary of the changes made in this branch.
4. Include clear, step-by-step instructions for other developers to manually test the changes.
5. Always assign the PR to me by passing `--assignee @me` to `gh pr create`.
6. If I specify reviewers, labels, or additional assignees, include them via the appropriate `gh pr create` flags (keep `@me` in the assignee list).
7. If I request a draft PR, use the `--draft` flag.
