---
name: review-pr-feedback
description: Reviews feedback left on a GitHub PR, validates whether each piece of feedback is correct, and replies with findings. Use when asked to review or validate PR feedback/comments.
allowed-tools: Bash(gh *), Bash(git *)
---

## Setup

If no pull request URL was provided, prompt the user to provide one.

If no URL is provided after prompting user, then inform the user you cannot review feedback without the link to the PR.

If a URL is provided, use it in place of {{URL_TO_PR}} used in the instructions below.

---

## Step 1 — Retrieve PR metadata and feedback

Fetch the PR details and all review comments:

```bash
gh pr view {{URL_TO_PR}} --json number,title,baseRefName,headRefName,files
```

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews
```

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments
```

Also fetch any replies/threads on those comments:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --paginate
```

Use `in_reply_to_id` to reconstruct threads so you understand the full conversation context for each piece of feedback.

Checkout the PR branch so you can read the actual code:

```bash
gh pr checkout {{URL_TO_PR}}
```

## Step 2 — Identify feedback to validate

From the retrieved comments and reviews, identify each distinct piece of feedback that meets **all** of these criteria:
- It is a review comment or inline comment (not a general conversation comment like "LGTM" or status updates).
- It raises a concern, requests a change, or suggests an improvement about the code.
- It has **not** already been validated by a previous run of this skill (check for existing reply comments from this workflow).

Skip comments that are:
- Pure questions with no assertion about the code.
- Acknowledgements, approvals, or status updates.
- Already replied to by this validation workflow.

## Step 3 — Validate each piece of feedback

For each piece of feedback identified in Step 2:

1. **Read the code** the feedback refers to. Use the file path and line numbers from the comment to read the relevant code in the checked-out branch. Read enough surrounding context to fully understand the code's behavior.

2. **Understand the feedback's claim.** What exactly is the reviewer asserting is wrong, missing, or suboptimal?

3. **Validate the claim.** Determine whether the feedback is correct by:
   - Reading the referenced code and its surrounding context.
   - Tracing the logic, data flow, and call sites as needed.
   - Checking relevant tests, types, and documentation.
   - Considering the project's conventions and style guide if applicable.

4. **If a recommended fix is included in the feedback**, also validate the fix:
   - Would the proposed change actually resolve the issue described?
   - Does it introduce any new problems (regressions, style violations, edge cases)?
   - Is it the best approach, or is there a better alternative?

## Step 4 — Respond to each piece of feedback

Based on your validation, reply to each feedback comment on the PR using the GitHub API. Your response must follow one of these three paths:

### Path A — Feedback is valid, recommended fix is valid (or no fix was suggested)

Reply confirming the feedback is valid. If a fix was recommended and it is correct, acknowledge that too.

Format:
```
✅ **Feedback validated**

This feedback is correct. {concise explanation of why the identified issue is real, referencing the specific code behavior}.

{If a fix was suggested: "The recommended fix would resolve this issue." + brief explanation of why it works.}
```

### Path B — Feedback is valid, but the recommended fix is incorrect or suboptimal

Reply confirming the issue is real but propose a better solution.

Format:
```
⚠️ **Feedback valid — alternate fix recommended**

The identified issue is correct: {concise explanation of the problem}.

However, the suggested fix {explain why it wouldn't fully resolve the issue or what new problems it would introduce}.

**Recommended approach:**
{Describe the alternate solution with enough detail for the developer to implement it. Include code snippets where helpful.}
```

### Path C — Feedback is not valid

Reply explaining why the feedback is incorrect.

Format:
```
❌ **Feedback not validated**

This feedback does not appear to be correct. {Detailed explanation of why the code is actually fine, referencing specific logic, types, tests, or documentation that contradicts the reviewer's claim.}
```

### How to post reply comments

Use `gh api` to reply to each review comment in its thread:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --method POST \
  -f body="<your response>" \
  -F in_reply_to=<original_comment_id>
```

If the feedback is from a review body (not an inline comment), reply as a regular issue comment:

```bash
gh api repos/{owner}/{repo}/issues/{pr_number}/comments \
  --method POST \
  -f body="<your response>"
```

## Step 5 — Summary

After processing all feedback, output a summary to the user (do NOT post this to the PR):

**Feedback Validation Summary for PR #{{number}}**

| # | Feedback | File | Result | Action Taken |
|---|----------|------|--------|--------------|
| 1 | {short description} | {file:line} | ✅ Valid | Confirmed |
| 2 | {short description} | {file:line} | ⚠️ Valid (fix rejected) | Alternate fix proposed |
| 3 | {short description} | {file:line} | ❌ Invalid | Explained why |

- Total feedback reviewed: {{count}}
- Valid: {{count}}
- Valid with alternate fix: {{count}}
- Invalid: {{count}}
