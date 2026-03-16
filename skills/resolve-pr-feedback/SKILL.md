---
name: resolve-pr-feedback
description: Reads all feedback on a GitHub PR, generates a plan to resolve each piece, implements the fixes with individual commits, pushes changes, and replies to each comment explaining the resolution.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(gh *), Bash(git *), Bash(npm *), Bash(npx *), Bash(docker *), Agent
---

## Setup

If no pull request URL was provided, prompt the user to provide one.

If no URL is provided after prompting, inform the user you cannot resolve feedback without the link to the PR.

If a URL is provided, use it in place of {{URL_TO_PR}} used in the instructions below.

---

## Step 1 — Retrieve PR metadata and all feedback

Fetch the PR details:

```bash
gh pr view {{URL_TO_PR}} --json number,title,baseRefName,headRefName,body,files
```

Checkout the PR branch:

```bash
gh pr checkout {{URL_TO_PR}}
```

Fetch all review comments (inline/code-level feedback):

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --paginate
```

Fetch all reviews (top-level review bodies):

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews
```

Fetch general issue-level comments:

```bash
gh api repos/{owner}/{repo}/issues/{pr_number}/comments --paginate
```

Use `in_reply_to_id` to reconstruct threads so you understand the full conversation context for each piece of feedback.

## Step 2 — Identify actionable feedback

From all retrieved comments and reviews, identify each distinct piece of feedback that meets **all** of these criteria:
- It requests a code change, suggests an improvement, or identifies a bug/issue to fix.
- It has **not** already been resolved (check for reply comments indicating resolution).

Skip comments that are:
- Pure questions with no actionable request.
- Acknowledgements, approvals, or status updates (e.g., "LGTM", "Approved").
- Already resolved by a previous run of this skill (look for resolution reply comments).
- Automated bot comments with no actionable content.

For each piece of actionable feedback, record:
- The comment ID (needed for replying later).
- The file path and line number(s) referenced.
- The full text of the feedback and any thread replies.
- Whether it is an inline review comment or a general comment.

## Step 3 — Generate a resolution plan

Before making any changes, present a numbered plan to the user summarizing how you intend to resolve each piece of feedback:

**Resolution Plan for PR #{{number}}**

| # | Feedback | File | Planned Resolution |
|---|----------|------|--------------------|
| 1 | {short description of feedback} | {file:line} | {brief description of planned fix} |
| 2 | ... | ... | ... |

Wait for the user to confirm the plan before proceeding. If the user wants to skip or modify resolution of specific items, adjust accordingly.

## Step 4 — Resolve each piece of feedback

For each piece of actionable feedback, in the order listed in the plan:

1. **Read the relevant code.** Use the file path and line numbers from the comment. Read enough surrounding context to fully understand the code and the reviewer's concern.

2. **Implement the fix.** Make the code changes needed to resolve the feedback. Follow existing code conventions and patterns in the project.

3. **Verify the fix.** After making changes:
   - Ensure the code is syntactically correct.
   - Run any relevant tests if they exist and are quick to execute.
   - Confirm no obvious regressions are introduced.

4. **Commit the fix.** Stage only the files relevant to this specific piece of feedback and create a commit:

```bash
git add <relevant files>
git commit -m "<concise message describing what was resolved and why>"
```

The commit message should:
- Be concise but descriptive.
- Reference the feedback it resolves (e.g., "address review feedback: ...").
- Follow the commit message style conventions of the repo.

5. **Move to the next piece of feedback.** Repeat steps 1-4 for each item.

## Step 5 — Push all changes

Once all feedback has been resolved and committed:

```bash
git push
```

If the push is rejected (e.g., remote has new commits), pull with rebase first:

```bash
git pull --rebase && git push
```

## Step 6 — Reply to each piece of feedback on the PR

After pushing, reply to each resolved comment on the PR explaining how it was addressed.

### For inline review comments

Reply in the same thread using:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --method POST \
  -f body="<response>" \
  -F in_reply_to=<original_comment_id>
```

### For general issue-level comments

Reply using:

```bash
gh api repos/{owner}/{repo}/issues/{pr_number}/comments \
  --method POST \
  -f body="<response>"
```

### Reply format

Each reply should follow this format:

```
Resolved in {{commit_sha_short}}.

{{Brief explanation of what was changed and how it addresses the feedback.}}
```

Keep replies concise and factual. Do not over-explain.

## Step 7 — Summary

After all feedback has been resolved, pushed, and replied to, output a summary to the user (do NOT post this to the PR):

**Feedback Resolution Summary for PR #{{number}}**

| # | Feedback | File | Resolution | Commit |
|---|----------|------|------------|--------|
| 1 | {short description} | {file:line} | {what was done} | {short SHA} |
| 2 | ... | ... | ... | ... |

- Total feedback resolved: {{count}}
- Total commits created: {{count}}
- All changes pushed: Yes/No
- All comments replied to: Yes/No
