---
name: enrich-jira-issue
description: Read a Jira issue's requirements, analyze the codebase for technical implementation details, ask clarifying questions, then update the issue with technical notes and testing requirements.
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion
---

## Step 1: Validate Environment

Run the following check before doing anything else:

```bash
for var in JIRA_API_TOKEN JIRA_EMAIL JIRA_BASE_URL; do
  if [[ -z "${!var:-}" ]]; then
    echo "MISSING: $var"
  fi
done
```

If any variables are missing, inform the user which ones are unset and stop.

## Step 2: Get the Jira Issue

If no Jira issue key or URL was provided, prompt the user to provide one.

Extract the issue key from the URL or use the key directly (e.g. `ENG-1234`).

Fetch the issue details:

```bash
curl -s \
  -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}/rest/api/2/issue/<ISSUE_KEY>?fields=summary,description"
```

Parse the response and extract:
- The issue **summary** (title)
- The issue **description** (full body)

Display the issue summary and description to the user so they can confirm this is the correct issue.

Store the original description exactly as-is — it will be preserved later.

## Step 3: Analyze the Codebase

Treat the current working directory as the project root.

Using the issue's requirements as context, investigate the codebase to understand how the work should be implemented:

1. Use `Glob`, `Grep`, `Read`, and `Agent` (with `subagent_type: "Explore"`) as needed to find code relevant to the issue's requirements.
2. Read any relevant documentation files (READMEs, docs/, etc.).
3. Identify:
   - Relevant files, modules, and code paths that will need to be created or modified
   - Existing patterns and conventions that should be followed
   - Dependencies or architectural considerations
   - Database models, API routes, services, or other layers involved
   - Edge cases or potential pitfalls

## Step 4: Ask Clarifying Questions

Before compiling results, review what you've learned from both the issue requirements and the codebase analysis.

If there are any ambiguities, gaps, or areas where the requirements are unclear, ask the user clarifying questions using `AskUserQuestion`. Examples of things to clarify:
- Unclear acceptance criteria
- Ambiguous behavior for edge cases
- Missing details about error handling or validation
- Questions about which existing patterns to follow when multiple options exist

Wait for the user to respond before proceeding. You may ask follow-up questions if needed.

If everything is clear, tell the user you have no clarifying questions and proceed.

## Step 5: Compile Technical Implementation Details

Based on your analysis and any clarifications received, compile:

### Technical Notes
A list of specific, actionable technical implementation details. Each item should be concrete enough for a developer to act on. Include:
- Files to create or modify (with paths)
- Patterns to follow (reference existing code)
- Database changes needed
- API contract details
- Service layer changes
- Dependencies or imports required
- Any architectural decisions or trade-offs

### Testing Requirements
A list of use cases that tests must cover. These should be specific test scenarios, not vague categories. Include:
- Happy path scenarios
- Error/failure scenarios
- Edge cases
- Auth/permission scenarios (if applicable)
- Validation scenarios (if applicable)

Present the compiled details to the user for review before updating the issue. Ask if they want to make any changes.

## Step 6: Update the Jira Issue

Construct the new description using this exact structure:

```
{{SUMMARY}}

## 💻 Technical Notes
- {{LIST OF TECHNICAL IMPLEMENTATION DETAILS}}

### Acceptance Criteria

- {{LIST OF CRITERIA THAT MUST BE MET TO MEET THE LISTED REQUIREMENTS}}

## 🧪 Testing Requirements
*At minimum, the following use cases should be covered by tests:*
- {{LIST OF USE CASES THAT TESTS MUST COVER}}
---

## Original Notes
{{THE ORIGINAL DESCRIPTION STORED IN STEP 2}}
```

Where:
- `{{SUMMARY}}` is a brief summary of the issue's purpose (1-2 sentences derived from the issue title and description)
- `{{LIST OF TECHNICAL IMPLEMENTATION DETAILS}}` is the bulleted list from Step 5
- `{{LIST OF USE CASES THAT TESTS MUST COVER}}` is the bulleted list from Step 5
- `{{THE ORIGINAL DESCRIPTION STORED IN STEP 2}}` is the exact original description captured in Step 2

Update the issue description via the Jira API:

```bash
curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg desc "<NEW_DESCRIPTION>" '{fields: {description: $desc}}')" \
  "${JIRA_BASE_URL}/rest/api/2/issue/<ISSUE_KEY>"
```

Verify the response returns a successful HTTP status code (2xx).

## Step 7: Report Result

- Confirm the issue was updated successfully.
- Display the issue URL: `${JIRA_BASE_URL}/browse/<ISSUE_KEY>`
- If any step fails, display the error output and suggest the user check their environment variables and Jira permissions.
