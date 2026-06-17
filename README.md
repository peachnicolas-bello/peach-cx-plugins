# peach-cx-plugins

Private internal Claude Code plugin marketplace for the Peach CX workflow.

## Layout

```
.claude-plugin/
  marketplace.json          # registers the plugins below (marketplace name: peach-cx)
claude/plugins/
  dev/                      # debugging + the shared investigation agent pool
    plugin.json
    agents/
      codebase-investigator.md
      precedent-researcher.md
      slack-context-researcher.md
      infra-incident-agent.md
      product-policy-agent.md
      config-lender-agent.md
      signals-queries-agent.md
      hypothesis-tester.md
    skills/debug/SKILL.md
  support/                  # bug reporting
    plugin.json
    agents/
      duplicate-checker.md
      routing-agent.md
    skills/bug/SKILL.md
  research/                 # ticket research
    plugin.json
    agents/
      business-researcher.md
      external-researcher.md
      internal-researcher.md
    skills/research/SKILL.md
```

## Installation

This repo is private, so Claude Code needs a GitHub token with `repo` scope to
clone it as a marketplace.

### 1. Export your GitHub token

```bash
# easiest, reuse the gh CLI token
export GITHUB_TOKEN="$(gh auth token)"

# or use a personal access token with repo scope
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

### 2. Add the marketplace by pointing Claude Code at this repo

In Claude Code:

```
/plugin marketplace add peachnicolas-bello/peach-cx-plugins
```

The marketplace registers itself under the name `peach-cx`. Refresh later with
`/plugin marketplace update peach-cx`.

### 3. Install individual plugins

Install only what you need. The format is `plugin@marketplace`:

```
/plugin install dev@peach-cx
/plugin install support@peach-cx
/plugin install research@peach-cx
```

After install, the skills are available as `/debug`, `/bug`, and `/research`.
Manage or remove them anytime with `/plugin`.

## Available plugins

| Plugin | Command | What it does |
|---|---|---|
| `dev` | `/debug` | Investigate an issue end to end, code-first. The code tells you the exact strings, exception types, and identifiers to search for, so you stop guessing. Six steps: understand, search the codebase, pick the right signals, run queries, analyze, report. |
| `support` | `/bug` | Turn raw context or an interactive Q&A into a ready-to-file Shortcut story. Takes optional background text (`/bug the login page crashes when you try to pay_off a statement`), parses what it can, fills the gaps with short questions, then drafts and iterates until you approve. Leads with THE ASK and drops empty sections. |
| `research` | `/research` | Given a ticket, fetch and analyze it, fan out the three research agents in parallel, and synthesize a research document for the next phase (including follow-up tickets). |

## Agents

The agents run in parallel, each blind to the others, so the divergence between
them surfaces gaps. They are modeled on the real teams that weigh in on a
ticket: TSE, DevOps, Product, Solutions, CX.

### dev plugin (investigation + debug pool)

`/debug` spawns codebase-investigator and signals-queries-agent together, then
hypothesis-tester to attack the leading cause. The full pool is also available
for `/investigate` to fan out across, namespaced `dev:<agent>`.

| Agent | Team lens | What it is aware of | Tools |
|---|---|---|---|
| `codebase-investigator` | TSE / Backend | Actual behavior on the failing path, code-first, with `repo/file.py:LINE` citations. | Read, Grep, Glob, Bash |
| `precedent-researcher` | TSE / CX | Zendesk + Shortcut history across all assignees: has this happened, how was it actually fixed, who resolved it. | Zendesk + Shortcut MCP |
| `slack-context-researcher` | Cross-team | Internal Slack threads, incidents, eng context, and the SME to loop in. | Slack MCP |
| `infra-incident-agent` | DevOps | Active or recent incident, deploy, or background-process failure before code is blamed. | Slack MCP, WebFetch |
| `product-policy-agent` | Product | Intended vs bug vs roadmap vs SOW, and Docs Hub coverage. | Read, Grep, Shortcut MCP |
| `config-lender-agent` | Solutions / SE | Per-lender config, quirks, company IDs; self-serve vs Solutions vs eng. | Read, Grep, Glob |
| `signals-queries-agent` | TSE | Turns a hypothesis into exact SQL/API checks anchored to real schema. | Read, Grep, Glob, Bash |
| `hypothesis-tester` | Adversarial | Tries to refute the leading root-cause before it ships. | Read, Grep, Glob, Bash |

### support plugin (bug pool)

`/bug` spawns both before drafting.

| Agent | What it does | Tools |
|---|---|---|
| `duplicate-checker` | Searches Shortcut for an existing story so we comment instead of duplicating. | Shortcut MCP |
| `routing-agent` | Picks the team, channel, and SE owner, plus routine vs on-call urgency. | Read, Grep, Glob |

### research plugin

`/research` spawns these three in parallel.

| Agent | What it is aware of | Tools |
|---|---|---|
| `internal-researcher` | The codebase: architecture, patterns, risk areas; cites `repo/file.py:LINE`. | Read, Grep, Glob, Bash |
| `external-researcher` | The outside world: APIs, libraries, docs, third-party constraints; cites URLs. | Read, Grep, Glob, WebSearch, WebFetch |
| `business-researcher` | The business value of scope: build, cut, or clarify, cost/benefit razor. | Read, Grep, Glob, WebSearch, WebFetch |

The MCP-backed agents (Zendesk, Shortcut, Slack) only work when those servers
are connected, and they are read-only by instruction. When a server is down
they report "source unavailable" rather than inventing an empty result.

All skills and agents pin `model: claude-opus-4-6`.
