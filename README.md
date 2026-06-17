# peach-cx-plugins

Private internal Claude Code plugin marketplace for the Peach CX workflow.

## Layout

```
.claude-plugin/
  marketplace.json          # registers the plugins below (marketplace name: peach-cx)
claude/plugins/
  dev/                      # debugging
    plugin.json
    skills/debug/SKILL.md
  support/                  # bug reporting
    plugin.json
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

The `research` plugin ships three subagents. The `/research` skill spawns them
in parallel; you can also call them directly.

| Agent | What it is aware of | Tools |
|---|---|---|
| `internal-researcher` | The codebase. Maps the existing architecture, patterns, and code relevant to a project, and surfaces problem areas that could affect implementation. Searches code-first and cites `repo/file.py:LINE`. | Read, Grep, Glob, Bash |
| `external-researcher` | The outside world. APIs, libraries, documentation, best practices, and third-party services, with the constraints an implementer needs (endpoints, auth, rate limits, error codes, deprecations). Cites source URLs and versions. | Read, Grep, Glob, WebSearch, WebFetch |
| `business-researcher` | The business value of the requested scope. Applies a ruthless cost/benefit razor to decide what to build, cut, or clarify before engineering time is committed. Optimizes up front for predictability and ROI. | Read, Grep, Glob, WebSearch, WebFetch |

All skills and agents pin `model: claude-opus-4-6`.
