---
name: create-jira-issue
description: Create a new Jira issue by gathering details from the user, optionally analyzing the codebase for technical context, then calling the Jira API.
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion
---

## Step 1: Gather Issue Details

If the user has already provided details about the issue (e.g. as arguments or in the conversation), use those. Otherwise, prompt the user:

1. Ask: **"What is this issue about? Please describe the feature, bug, or task."**
2. Wait for the user's response before proceeding.

## Step 2: Generate or Confirm the Title

- If the user explicitly provided a title/summary, use it as-is.
- If the user only provided a description, generate a concise one-line summary from their details and present it to the user for confirmation.

## Step 3: Offer Codebase Analysis

Ask the user: **"Would you like me to analyze the current codebase to gather technical details related to this issue?"**

- **If the user says no**: Skip to Step 4.
- **If the user says yes**:
  1. Treat the current working directory as the project root.
  2. Use `Glob`, `Grep`, `Read`, and `Agent` (with `subagent_type: "Explore"`) as needed to investigate code relevant to the issue.
  3. Read any relevant documentation files (READMEs, docs/, etc.).
  4. If anything is unclear or ambiguous, ask the user clarifying questions to ensure accuracy.
  5. Compile the technical findings into a structured section to append to the issue description. Format it clearly under a heading like **"💻 Technical Notes"** and include:
     - Relevant files and code paths
     - Current behavior (for bugs) or related existing functionality (for features)
     - Any dependencies or architectural considerations
  6. Present the full assembled description (user's details + technical context) to the user for review before proceeding.

## Step 4: Validate Environment

Run the following check before calling the script:

```bash
for var in JIRA_API_TOKEN JIRA_EMAIL JIRA_BASE_URL JIRA_PROJECT_ID JIRA_BOARD_ID; do
  if [[ -z "${!var:-}" ]]; then
    echo "MISSING: $var"
  fi
done
```

If any variables are missing, inform the user which ones are unset and stop. Do **not** proceed without all four variables.

## Step 5: Create the Issue

Call the bash script, passing the summary and description as arguments:

```bash
bash /Users/wraith/the_lab/jean-claude/skills/create-jira-issue/create-jira-issue.sh "<summary>" "<description>"
```

- The summary is argument 1 (the one-line title).
- The description is argument 2 (the full issue body).
- Both arguments must be properly quoted to handle special characters and newlines.

## Step 6: Sprint Assignment (Optional)

After the issue is created successfully:

1. Fetch active and future sprints for the board:
   ```bash
   curl -s \
     -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
     -H "Content-Type: application/json" \
     "${JIRA_BASE_URL}/rest/agile/1.0/board/${JIRA_BOARD_ID}/sprint?state=active,future"
   ```

2. Parse the response and present a numbered list of sprints to the user (showing sprint name and state).

3. Ask the user: **"Would you like to add this issue to a sprint?"** and present the list with a "Skip" option.

4. If the user selects a sprint, assign the issue:
   ```bash
   curl -s -w "\n%{http_code}" \
     -X POST \
     -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
     -H "Content-Type: application/json" \
     -d '{"issues":["<ISSUE_KEY>"]}' \
     "${JIRA_BASE_URL}/rest/agile/1.0/sprint/<SPRINT_ID>/issue"
   ```

5. If the user skips, proceed without sprint assignment.

## Step 7: Report Result

- Display the issue URL returned by the script.
- If a sprint was assigned, confirm which sprint.
- If any step fails, display the error output and suggest the user check their environment variables and Jira permissions.
