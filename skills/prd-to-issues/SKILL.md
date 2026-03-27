---
name: prd-to-issues
description: Break a PRD into independently-grabbable GitHub issues using tracer-bullet vertical slices. Use when user wants to convert a PRD to issues, create implementation tickets, or break down a PRD into work items.
---

# PRD to Issues

Break a PRD into independently-grabbable GitHub issues using vertical slices (tracer bullets).

## Process

### 1. Locate the PRD and resolve the target repo

Ask the user for the PRD GitHub issue number (or URL).

Determine the target `owner/repo` from the issue URL, or by running:

```bash
gh repo view --json nameWithOwner --jq '.nameWithOwner'
```

If the PRD is not already in your context window, fetch it with `gh issue view <number>` (with comments).

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories from the PRD this addresses

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Resolve the parent issue node ID

Before creating sub-issues, fetch the GraphQL node ID of the parent PRD issue. You will need this to link each sub-issue to the parent.

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        id
      }
    }
  }
' -f owner="<owner>" -f repo="<repo>" -F number=<prd-issue-number>
```

Save the returned `id` value (e.g. `I_kwDOxxxxxxx`) for use in step 6.

### 6. Create the GitHub issues as sub-issues

For each approved slice, create a GitHub issue using `gh issue create`, then immediately add it as a sub-issue of the parent PRD issue.

Create issues in dependency order (blockers first) so you can reference real issue numbers in the "Blocked by" field.

For each slice:

**a) Create the issue:**

```bash
gh issue create --repo "<owner/repo>" --title "<title>" --body "$(cat <<'EOF'
<body from template below>
EOF
)"
```

Capture the returned issue URL.

**b) Add as sub-issue of the parent PRD:**

```bash
gh api graphql -f query='
  mutation($parentId: ID!, $subIssueUrl: String!) {
    addSubIssue(input: {issueId: $parentId, subIssueUrl: $subIssueUrl}) {
      issue {
        id
      }
      subIssue {
        id
        url
      }
    }
  }
' -f parentId="<parent-node-id>" -f subIssueUrl="<newly-created-issue-url>"
```

If the `addSubIssue` mutation fails, log the error and continue creating the remaining issues. Report any failures to the user at the end.

<issue-template>
## Parent PRD

#<prd-issue-number>

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent PRD rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Blocked by #<issue-number> (if any)

Or "None - can start immediately" if no blockers.

## User stories addressed

Reference by number from the parent PRD:

- User story 3
- User story 7

</issue-template>

Do NOT close or modify the parent PRD issue.
