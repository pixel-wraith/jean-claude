---
name: code-audit
description: Performs a full code audit of the current project and outputs any findings from that audit. 
---

This skill performs a comprehensive code audit by launching 5 specialized audit agents **in parallel**. All agents run simultaneously as background tasks to minimize total audit time.

## Agents and Output Files

| Agent (`subagent_type`) | Output File |
|---|---|
| `security-auditor` | `issues-security.spec.md` |
| `performance-auditor` | `issues-performance.spec.md` |
| `reliability-auditor` | `issues-reliability.spec.md` |
| `functionality-auditor` | `issues-functionality.spec.md` |
| `best-practices-auditor` | `issues-best-practices.spec.md` |

## Execution Logic

### Step 1: Launch all 5 agents simultaneously

Send a **single message** containing 5 `Task` tool calls — one per agent. Every call MUST set `run_in_background: true` so they execute concurrently. Use the prompts below:

- **security-auditor**: `"Perform a security audit of the code in this project. Write your findings to issues-security.spec.md in the project root."`
- **performance-auditor**: `"Perform a performance audit of the code in this project. Write your findings to issues-performance.spec.md in the project root."`
- **reliability-auditor**: `"Perform a reliability audit of the code in this project. Write your findings to issues-reliability.spec.md in the project root."`
- **functionality-auditor**: `"Perform a functionality audit of the code in this project. Write your findings to issues-functionality.spec.md in the project root."`
- **best-practices-auditor**: `"Perform a best practices audit of the code in this project. Write your findings to issues-best-practices.spec.md in the project root."`

### Step 2: Wait for all agents to complete

After launching, poll each agent's `output_file` using `TaskOutput` (with `block: true`) to wait for completion. You may poll all 5 in parallel.

### Step 3: Summarize results

Once all agents have finished, present a summary to the user that includes:
- A status line per agent (completed / failed)
- The path to each output file
- A brief highlight of the top findings from each audit (if available)
