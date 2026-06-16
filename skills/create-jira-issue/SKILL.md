---
name: create-jira-issue
description: Create a new Jira issue by gathering details from the user, analyzing the codebase for technical context, grilling the user to remove ambiguity, then creating a fully self-contained ticket via the Jira API.
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion
---

Every issue created by this skill MUST follow the **Standard Ticket Structure** below. The goal is a ticket a junior engineer can pick up and complete with **zero** prior context and **no** follow-up questions. Reference example: ENG-2114.

## Standard Ticket Structure

The description is written in **Jira wiki markup** (the v2 REST API renders wiki markup, NOT Markdown — see "Wiki markup rules" at the bottom). Use these sections, in this order.

**Core sections — ALWAYS required:**

- `h2. In one sentence` — one plain-language sentence stating what this ticket changes.
- `h2. Background (no prior context needed)` — enough context that a junior with no knowledge of this work can understand it. Explain the "why" and the current state.
- `h2. Step by step` — numbered, concrete implementation steps (`#` for numbered list).
- `h2. What NOT to do` — explicit out-of-scope items and traps to avoid (`*` bullets).
- `h2. Acceptance criteria` — checklist of conditions that must be true for the ticket to be done (`*` bullets). Include test-suite passing where relevant.
- `h2. How to test` — how to verify the change, automated and manual.

**Optional sections — include ONLY when they add value:**

- `h2. Key terms` — define any domain/codebase jargon used in the ticket (`*` bullets, term in `*bold*`).
- `h2. Prerequisites (blocked by)` — blocking tickets, or `None`. Include whenever the work depends on or is sequenced after other tickets.
- `h2. Reference to copy from` — existing files/patterns to model the work on (with paths). Include whenever a clear template exists in the codebase.
- `h2. If you get stuck` — the single most useful pointer for when the implementer is lost.

Add a closing line linking the parent epic/initiative when one exists (e.g. "This story is part of the GAPI V2 epic (<epic-url>)").

Do not invent sections outside this set. Omit an optional section entirely rather than padding it.

## Step 1: Gather Issue Details

If the user already described the issue (as arguments or earlier in the conversation), use that. Otherwise ask: **"What is this issue about? Please describe the feature, bug, or task."** Wait for the response before proceeding.

## Step 2: Generate or Confirm the Title

- If the user gave an explicit title/summary, use it as-is.
- Otherwise generate a concise one-line summary from their details and present it for confirmation.

## Step 3: Analyze the Codebase (MANDATORY)

Codebase analysis is **required** — it is the raw material for the structured sections. Treat the current working directory as the project root.

1. Use `Glob`, `Grep`, `Read`, and `Agent` (with `subagent_type: "Explore"`) to investigate code relevant to the issue.
2. Read relevant documentation (READMEs, `docs/`, `CLAUDE.md`, styleguides).
3. Identify, at minimum:
   - Files/modules/code paths to create or modify (with paths) → feeds **Step by step** and **Reference to copy from**.
   - Existing patterns and conventions to follow → feeds **Reference to copy from**.
   - Domain terms a junior wouldn't know → feeds **Key terms**.
   - Dependencies, blocking work, or architectural considerations → feeds **Prerequisites** and **Background**.
   - Edge cases and likely traps → feeds **What NOT to do** and **How to test**.

## Step 4: Grill the User Until Every Required Section Can Be Filled

Before assembling anything, review what the issue and the codebase tell you, then **interrogate the gaps**. Using `AskUserQuestion`, ask clarifying questions until you can write each required section with concrete, junior-actionable detail — not placeholders.

Keep asking (follow-ups allowed) until there are no remaining ambiguities in:
- Scope and explicit non-goals (so **What NOT to do** is real).
- Acceptance criteria (what "done" means, measurably).
- Edge cases, error handling, and validation behavior.
- Which existing pattern to follow when several exist.
- Any blocking work / prerequisites.

Only stop when you could genuinely hand the ticket to a junior with no follow-up needed. If something is already clear, say so and move on — don't ask for the sake of asking.

## Step 5: Assemble the Description

Compose the full description in **Jira wiki markup** following the Standard Ticket Structure. Fill core sections from the user's details + codebase analysis + clarifications. Include optional sections only where they add value.

## Step 6: Review

Present the full assembled description to the user. Ask if they want changes. Revise until approved.

## Step 7: Validate Environment

```bash
for var in JIRA_API_TOKEN JIRA_EMAIL JIRA_BASE_URL JIRA_BOARD_ID; do
  if [[ -z "${!var:-}" ]]; then
    echo "MISSING: $var"
  fi
done
```

If any are missing, tell the user which are unset and stop.

## Step 8: Create the Issue

```bash
bash /Users/wraith/the_lab/jean-claude/skills/create-jira-issue/create-jira-issue.sh "<summary>" "<description>"
```

- Summary is argument 1; description (the full wiki-markup body) is argument 2.
- Quote both arguments to preserve newlines and special characters.

## Step 9: Sprint Assignment (Optional)

After creation succeeds:

1. Fetch active/future sprints:
   ```bash
   curl -s \
     -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
     -H "Content-Type: application/json" \
     "${JIRA_BASE_URL}/rest/agile/1.0/board/${JIRA_BOARD_ID}/sprint?state=active,future"
   ```
2. Present a numbered list (name + state) with a "Skip" option, and ask: **"Would you like to add this issue to a sprint?"**
3. If a sprint is chosen:
   ```bash
   curl -s -w "\n%{http_code}" \
     -X POST \
     -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
     -H "Content-Type: application/json" \
     -d '{"issues":["<ISSUE_KEY>"]}' \
     "${JIRA_BASE_URL}/rest/agile/1.0/sprint/<SPRINT_ID>/issue"
   ```
4. If skipped, proceed without assignment.

## Step 10: Report Result

- Display the issue URL returned by the script.
- Confirm the sprint if one was assigned.
- On any failure, show the error output and suggest checking env vars and Jira permissions.

## Wiki markup rules (Jira v2 API — NOT Markdown)

- Headers: `h2.` for sections, `h3.` for sub-sections (NOT `##`).
- Bullets: `*` (nested: `**`). Numbered lists: `#`.
- Bold: `*text*`. Inline code: `{{code}}`. Code block: `{code}...{code}`.
- Horizontal rule: `----`.
- Links: paste the URL directly, or `[text|url]`.
- Escape literal braces as `\{` and `\}` so they don't start a macro.
