![head.png](head.png)

# Dream Driven Development

This repo is based on a talk given at [UpstatePHP Oct 9th 2025](https://upstatephp.com), a workflow idea of having AI Agent write code while you sleep. 
[Download slideshow](https://gamma.app/docs/D-ream-D-riven-D-evelopment-qwzkqfr5hl70uzt)

Everything covered in this README file, are all about this Github Action Workflow: `.github/workflows/claude-linear-automation.yml`

While this is focused on using Claude Code + Linear.app, you could use Codex, OpenCode with a other ticketing systems which expose an MCP server to interact with. 

## How It Works (TLDR)

```
┌─────────────────────────────────────────┐
│  Cron: Daily 3AM UTC                    │
│  or Manual Trigger                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Checkout repo (full history)           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Claude Code Action (Agent Mode)        │
│  ├─ MCP: Linear Connection              │
│  └─ Prompt: Automation instructions     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  1. Query Linear for Backlog/Todo       │
│  2. Select 1-2 point ticket             │
│  3. Update status → In Progress         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Create feature branch               │
│  5. Implement ticket requirements       │
│  6. Commit changes                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  7. Push branch                          │
│  8. Create PR                            │
│  9. Request review from @bogdankharchenko│
└──────────────┬───────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  10. Update Linear → Needs Review       │
└─────────────────────────────────────────┘
```

**In one sentence:** While you sleep, Claude picks a ticket from your backlog, implements it, and has a PR waiting for your review when you wake up.

---

## Architecture

### **Trigger Configuration**

```yaml
schedule:
  - cron: '0 3 * * *'
workflow_dispatch:
```

- **Scheduled execution**: Runs daily at 3:00 AM UTC
- **Manual trigger**: Can be triggered manually via GitHub UI (`workflow_dispatch`)
- **Smart scheduling**: Off-peak hours minimize conflicts with human developers

---

### **Permissions Model**

The workflow requires extensive permissions to operate autonomously:

- `contents: write` - Create/modify files and branches
- `pull-requests: write` - Create and manage PRs
- `issues: write` - Update issue metadata
- `id-token: write` - OIDC token for authentication
- `actions: read` - Access workflow information

This is a **high-trust automation** with nearly full repository access.

---

### **Git Configuration**

```yaml
git config --global user.email "scriptor@gmail.com"
git config --global user.name "Bogdan Kharchenko"
```

Commits and PRs will appear as coming from Bogdan Kharchenko, making it clear who owns the automation.

---

### **Core Technology: Claude Code Action**

Uses `anthropics/claude-code-action@beta` in **agent mode**, which means:
- Claude operates with full autonomy (no human in the loop)
- It can make decisions and execute them
- Uses OAuth token for authentication (`CLAUDE_CODE_OAUTH_TOKEN`)

---

### **MCP Server Integration**

This is **critical** - it connects Claude to Linear via Model Context Protocol (MCP):

```yaml
mcp_config: |
  {
    "mcpServers": {
      "linear": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "--header",
                 "Authorization: Bearer ${{ secrets.LINEAR_API_KEY }}",
                 "https://mcp.linear.app/sse"]
      }
    }
  }
```

**How it works:**
1. Uses `npx` to run `mcp-remote` (no local installation needed)
2. Connects to Linear's SSE (Server-Sent Events) endpoint
3. Authenticates using Bearer token from GitHub Secrets
4. Gives Claude direct API access to Linear project management

---

### **Tool Permissions**

The workflow explicitly allowlists 40+ tools, including:

**Development tools:**
- File operations: `Read`, `Write`, `Edit`, `MultiEdit`
- Search: `Glob`, `Grep`
- Execution: `Bash(*)` with specific patterns for git, gh, php, composer, npm

**Linear MCP tools** (20+ tools for complete Linear integration):
- Issue management: `list_issues`, `get_issue`, `create_issue`, `update_issue`
- Status management: `list_issue_statuses`, `get_issue_status`
- Comments: `list_comments`, `create_comment`
- Documentation search: `search_documentation`

This allowlist ensures Claude can:
- Read/write code
- Commit changes
- Create PRs via GitHub CLI
- Update Linear tickets through the entire lifecycle

---

## The Automation Logic

This is the **brain** of the workflow - the direct prompt that instructs Claude's behavior:

### **Single-Ticket Philosophy**
```
Your ONLY job is to:
1. Find ONE ticket
2. Implement it
3. Create PR
4. Request review
```

**Why one ticket?**
- Reduces complexity and failure points
- Makes rollbacks simpler
- Easier to track what the automation did
- Prevents overwhelming reviewers

### **Ticket Selection Criteria**
- Status: "Backlog" OR "Todo"
- Complexity: 1-2 points (small, well-defined tasks)
- Quantity: ONE ticket per run

### **Status Flow**
```
Backlog/Todo → In Progress → Needs Review
```

**Key insight:** The ticket moves to "In Progress" IMMEDIATELY before implementation starts. This prevents duplicate work if multiple workflow runs occur.

### **Branch Naming Convention**
```
feature/TOD-X-brief-description
```
Clean, traceable format that links code to tickets.

### **PR Requirements**
- Title format: `"Implement [Ticket Title] (TOD-X)"`
- Body must include:
  - Summary of changes
  - Link to Linear ticket
  - `"Closes TOD-X"` for automatic linking
- **Critical:** Must request review from `@bogdankharchenko`

### **Guardrails**

The workflow explicitly prohibits:
- Multi-ticket work
- Unnecessary refactoring
- Extensive linting
- Scope creep
- Auto-closing tickets (only moves to "Needs Review", not "Done")

**Philosophy:** Minimal, focused changes that implement exactly what was requested.

---

### **Error Handling**

Graceful degradation strategy:
- No tickets → Exit silently
- Implementation blocked → Create draft PR with explanation
- PR creation fails → Document error
- Always attempt status update if work was done

---

## Security Considerations

**Secrets used:**
1. `GITHUB_TOKEN` - Auto-provided by GitHub Actions
2. `CLAUDE_CODE_OAUTH_TOKEN` - Custom secret for Claude API
3. `LINEAR_API_KEY` - Custom secret for Linear access

**Recommendation:** Monitor PR quality closely, especially initially.


---

## Key Insights

1. **Autonomous Development**: This workflow represents a shift from "AI assists developer" to "AI IS the developer"

2. **Integration Depth**: The MCP Linear integration gives Claude first-class access to project management, not just code

3. **Constraint-Based AI**: The detailed prompt acts as a "constitution" that bounds Claude's behavior

4. **Review-Required Safety**: The workflow never auto-merges; human review (`@bogdankharchenko`) is the safety gate

5. **Idempotent Design**: Moving tickets to "In Progress" immediately prevents race conditions between runs 
