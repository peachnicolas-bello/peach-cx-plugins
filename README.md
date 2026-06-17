# peach-cx-plugins

Private internal Claude Code plugin marketplace for the Peach CX workflow.

## Layout

```
.claude-plugin/
  marketplace.json          # registers the plugins below
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

## Plugins

- **dev** — `/debug`: investigate an issue end to end, code-first. The code
  tells you the exact strings, exception types, and identifiers to search for.
- **support** — `/bug`: turn raw context or an interactive Q&A into a
  ready-to-file Shortcut story. Lead with THE ASK.
- **research** — `/research`: fetch a ticket, fan out the internal, external,
  and business research agents in parallel, and synthesize a research document
  for the next phase.

All skills and agents pin `model: claude-opus-4-6`.

## Adding the marketplace

Point Claude Code at this repo as a plugin marketplace, then enable the `dev`,
`support`, and `research` plugins.
