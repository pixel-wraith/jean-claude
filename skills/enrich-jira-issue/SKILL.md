---
name: enrich-jira-issue
description: Read a Jira issue's requirements, analyze the codebase for technical implementation details, ask clarifying questions, then rewrite the issue into the Standard Ticket Structure (preserving the original notes).
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion
---

This skill rewrites an existing issue into the **Standard Ticket Structure** below. The goal is a ticket a junior engineer can pick up and complete with **zero** prior context and **no** follow-up questions. Reference example: ENG-2114.

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

Add a closing line linking the parent epic/initiative when one exists.

Do not invent sections outside this set. Omit an optional section entirely rather than padding it.

## Step 1: Validate Environment

```bash
for var in JIRA_API_TOKEN JIRA_EMAIL JIRA_BASE_URL; do
  if [[ -z "${!var:-}" ]]; then
    echo "MISSING: $var"
  fi
done
```

If any variables are missing, inform the user which ones are unset and stop.

## Step 2: Get the Jira Issue

If no Jira issue key or URL was provided, prompt the user. Extract the key from the URL or use it directly (e.g. `ENG-1234`).

Fetch the issue (request wiki markup, not rendered HTML):

```bash
curl -s \
  -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}/rest/api/2/issue/<ISSUE_KEY>?fields=summary,description"
```

Extract the **summary** (title) and **description** (full body). Display both so the user can confirm it's the right issue.

**Store the original description exactly as-is** — it will be preserved verbatim at the bottom of the rewritten ticket.

## Step 3: Analyze the Codebase

Treat the current working directory as the project root. Using the issue's requirements as context, investigate how the work should be implemented:

1. Use `Glob`, `Grep`, `Read`, and `Agent` (with `subagent_type: "Explore"`) to find relevant code.
2. Read relevant documentation (READMEs, `docs/`, `CLAUDE.md`, styleguides).
3. Identify, mapping findings to the structure's sections:
   - Files/modules/code paths to create or modify (with paths) → **Step by step**, **Reference to copy from**.
   - Existing patterns and conventions to follow → **Reference to copy from**.
   - Domain terms a junior wouldn't know → **Key terms**.
   - Dependencies, blocking work, architectural considerations → **Prerequisites**, **Background**.
   - Edge cases and likely traps → **What NOT to do**, **How to test**.

## Step 4: Grill the User Until Every Required Section Can Be Filled

Review what the issue and codebase tell you, then interrogate the gaps with `AskUserQuestion`. Keep asking (follow-ups allowed) until you can write each required section with concrete, junior-actionable detail — no placeholders. Resolve ambiguity in:
- Scope and explicit non-goals (so **What NOT to do** is real).
- Acceptance criteria (what "done" means, measurably).
- Edge cases, error handling, validation behavior.
- Which existing pattern to follow when several exist.
- Any blocking work / prerequisites.

Stop only when you could hand the ticket to a junior with no follow-up needed. If everything is already clear, say so and proceed.

## Step 5: Assemble the New Description

Compose the full body in **Jira wiki markup** following the Standard Ticket Structure, then append the preserved original at the bottom:

```
{{CORE + OPTIONAL SECTIONS, in the order defined above}}

{{closing epic/initiative link, if any}}

----

h2. Original Notes

{{THE ORIGINAL DESCRIPTION STORED VERBATIM IN STEP 2}}
```

The original notes block is preserved exactly — do not edit, summarize, or reformat it.

## Step 6: Review

Present the full assembled description to the user. Ask if they want changes. Revise until approved.

## Step 7: Update the Jira Issue

```bash
curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg desc "<NEW_DESCRIPTION>" '{fields: {description: $desc}}')" \
  "${JIRA_BASE_URL}/rest/api/2/issue/<ISSUE_KEY>"
```

Verify the response is a 2xx status code.

## Step 8: Report Result

- Confirm the issue was updated.
- Display the issue URL: `${JIRA_BASE_URL}/browse/<ISSUE_KEY>`.
- On any failure, show the error output and suggest checking env vars and Jira permissions.

## Wiki markup rules (Jira v2 API — NOT Markdown)

- Headers: `h2.` for sections, `h3.` for sub-sections (NOT `##`).
- Bullets: `*` (nested: `**`). Numbered lists: `#`.
- Bold: `*text*`. Inline code: `{{code}}`. Code block: `{code}...{code}`.
- Horizontal rule: `----`.
- Links: paste the URL directly, or `[text|url]`.
- Escape literal braces as `\{` and `\}` so they don't start a macro.
