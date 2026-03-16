---
name: create-github-issue
description: Create a new GitHub issue by gathering details from the user, optionally analyzing the codebase for technical context, then calling the GitHub API.
allowed-tools: Read, Write, Glob, Grep, Bash, Agent, AskUserQuestion
---

## Step 1: Resolve the Target Repository

Determine the `owner/repo` for the GitHub issue using the following process:

### 1a. Derive the project name from the current working directory

Try the following in order to get the project name:
1. Check `package.json` in the current directory for the `name` field (strip any `@scope/` prefix).
2. If no `package.json`, use the current directory's basename.

### 1b. Check the agent's memory for known repos

Read the memory file at:
```
/home/agent/.claude/projects/-Users-wraith-the-lab-jean-claude-skills/memory/github_repos.md
```

- If the file exists, check whether the derived project name matches any `owner/repo` entry (match against the repo portion after `/`).
- If a match is found, use that `owner/repo` and skip to Step 2.
- If the file does not exist or no match is found, continue to 1c.

### 1c. Fetch repos from GitHub and update memory

Run:
```bash
gh repo list --limit 1000 --json nameWithOwner --jq '.[].nameWithOwner'
```

Also fetch repos for all orgs the user belongs to:
```bash
gh org list 2>/dev/null | while read -r org; do
  gh repo list "$org" --limit 1000 --json nameWithOwner --jq '.[].nameWithOwner'
done
```

Combine all results into a deduplicated list. Write (or overwrite) the memory file at:
```
/home/agent/.claude/projects/-Users-wraith-the-lab-jean-claude-skills/memory/github_repos.md
```

Use this format:
```markdown
---
name: github_repos
description: Cached list of GitHub repos accessible to the authenticated user and their orgs, used by the create-github-issue skill for repo resolution.
type: reference
---

<one owner/repo per line>
```

### 1d. Match the project name against the fetched repos

- Check the derived project name against the full repo list (match against the repo portion after `/`).
- If exactly one match is found, use that `owner/repo`.
- If multiple matches are found across different owners, present them to the user and ask which one to use.
- If no match is found, ask the user to provide the full `owner/repo`.

Also update the `MEMORY.md` index if the `github_repos.md` entry does not already exist there.

## Step 2: Gather Issue Details

If the user has already provided details about the issue (e.g. as arguments or in the conversation), use those. Otherwise, prompt the user:

1. Ask: **"What is this issue about? Please describe the feature, bug, or task."**
2. Wait for the user's response before proceeding.

## Step 3: Generate or Confirm the Title

- If the user explicitly provided a title, use it as-is.
- If the user only provided a description, generate a concise one-line title from their details and present it to the user for confirmation.

## Step 4: Offer Codebase Analysis

Ask the user: **"Would you like me to analyze the current codebase to gather technical details related to this issue?"**

- **If the user says no**: Skip to Step 5.
- **If the user says yes**:
  1. Treat the current working directory as the project root.
  2. Use `Glob`, `Grep`, `Read`, and `Agent` (with `subagent_type: "Explore"`) as needed to investigate code relevant to the issue.
  3. Read any relevant documentation files (READMEs, docs/, etc.).
  4. If anything is unclear or ambiguous, ask the user clarifying questions to ensure accuracy.
  5. Compile the technical findings into a structured section to append to the issue body. Format it clearly under a heading like **"💻 Technical Notes"** and include:
     - Relevant files and code paths
     - Current behavior (for bugs) or related existing functionality (for features)
     - Any dependencies or architectural considerations
  6. Present the full assembled body (user's details + technical context) to the user for review before proceeding.

## Step 5: Validate GitHub CLI

Run the following check before calling the script:

```bash
gh auth status
```

If the `gh` CLI is not installed or not authenticated, inform the user and stop. They need to run `gh auth login` first.

## Step 6: Create the Issue

Call the bash script, passing the repo, title, and body as arguments:

```bash
bash /Users/wraith/the_lab/jean-claude/skills/create-github-issue/create-github-issue.sh "<owner/repo>" "<title>" "<body>"
```

- Argument 1 is the `owner/repo` resolved in Step 1.
- Argument 2 is the title (one-line summary).
- Argument 3 is the body (full issue description, supports GitHub-flavored Markdown).
- All arguments must be properly quoted to handle special characters and newlines.

## Step 7: Report Result

- If the script succeeds, display the issue URL returned by the script.
- If the script fails, display the error output and suggest the user check their `gh` CLI authentication (`gh auth status`) and repository permissions.
