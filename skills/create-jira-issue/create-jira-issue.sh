#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <summary> <description>" >&2
  exit 1
fi

SUMMARY="$1"
DESCRIPTION="$2"

for var in JIRA_API_TOKEN JIRA_EMAIL JIRA_BASE_URL JIRA_PROJECT_ID; do
  if [[ -z "${!var:-}" ]]; then
    echo "Error: $var is not set." >&2
    exit 1
  fi
done

STORY_ID=$(curl -s \
  -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}/rest/api/2/project/${JIRA_PROJECT_ID}" \
  | jq -r '.issueTypes[] | select(.name == "Story") | .id')

if [[ -z "$STORY_ID" ]]; then
  echo "Error: Could not find 'Story' issue type for project $JIRA_PROJECT_ID." >&2
  exit 1
fi

PAYLOAD=$(jq -n \
  --arg summary "$SUMMARY" \
  --arg description "$DESCRIPTION" \
  --arg project "$JIRA_PROJECT_ID" \
  --arg issuetype_id "$STORY_ID" \
  '{
    fields: {
      project: { key: $project },
      summary: $summary,
      description: $description,
      issuetype: { id: $issuetype_id }
    }
  }')

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${JIRA_BASE_URL}/rest/api/2/issue")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  ISSUE_KEY=$(echo "$BODY" | jq -r '.key')
  echo "Issue created successfully: ${JIRA_BASE_URL}/browse/${ISSUE_KEY}"
else
  echo "Error creating issue (HTTP $HTTP_CODE):" >&2
  echo "$BODY" >&2
  exit 1
fi
