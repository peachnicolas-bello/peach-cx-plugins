---
description: Run the full CX investigation protocol on a Zendesk ticket
argument-hint: <ticket-number>
model: claude-opus-4-6
---

# Investigate ZD #$ARGUMENTS — full protocol, mandatory pre-flight

You are running the CX investigation protocol defined in `.claude/CLAUDE.md`
on Zendesk ticket #$ARGUMENTS. The rules below are non-negotiable for this
turn. If you cannot satisfy them, stop and say so explicitly — do not skip
them.

## Step 1: Print the pre-flight checklist BEFORE anything else

The first thing in your response must be this block, filled in for ZD
#$ARGUMENTS. No preamble, no "let me investigate," no summary. The
checklist comes first.

```
PRE-FLIGHT — ZD #$ARGUMENTS

Ask / Problem / Want
  Ask:     <one line>
  Problem: <one line>
  Want:    <one line>

Sources actually searched (✅ = ran, ❌ = skipped + why)
  [ ] peach-main          grep: <pattern or "n/a — not a code question">
  [ ] peach-front         grep: <pattern or "n/a">
  [ ] peach-docs          grep: <pattern or "n/a">
  [ ] Zendesk precedent   query: <exact query string>
  [ ] Shortcut            query: <exact query string>
  [ ] Slack               query: <exact query string>

Load-bearing claims I'm about to make
  1. <claim> ← source: <file:line | ZD#x | sc-x | Slack permalink | VERIFY>
  2. <claim> ← source: ...

Lender quirks file consulted: <yes/no, which lender row in peach_lender_quirks.md>
Company ID memory consulted: <yes/no, which row>
Memory caveat: <one line — what in memory might be stale and how I'm cross-checking>
```

## Step 1.5: Fan out the investigation agents (triage-gated)

Decide depth first. If quick-mode triage applies (a config change the lender
can't self-service, a permission grant, a docs-answered question, a brand
lookup), do NOT fan out. Run it inline and keep it cheap, per the
calibrate-depth rule in `.claude/CLAUDE.md`.

If this is a full-mode ticket (behavior question, alleged bug, reconciliation
variance, recurring confusion, anything needing an eng / product / SOW
escalation), spawn the `dev:` plugin agents in parallel rather than searching
each source inline. They are blind to each other; the divergence between them
is the gap signal. Spawn them in a single batch:

- `dev:codebase-investigator` for the three-repo code search (protocol Step 1).
  Ground truth, with `repo/file.py:LINE` citations.
- `dev:precedent-researcher` for Zendesk history and Shortcut across all
  assignees and teams, plus the Resolution Research (protocol Steps 2 and 3).
- `dev:slack-context-researcher` for the Slack sweep and the SME to loop in
  (protocol Step 4).
- `dev:infra-incident-agent` when the symptom could be infra (settlement, cron,
  webhook, deploy, DNS). Rules an active incident in or out before code is
  blamed.
- `dev:product-policy-agent` when the question is intended-behavior vs bug vs
  roadmap vs SOW, or hinges on Docs Hub coverage.
- `dev:config-lender-agent` when the ticket is from a lender with known quirks
  or the behavior could be config-driven.

Always spawn the first three on a full-mode ticket. Add the last three when the
symptom fits their lens. You remain the synthesizer: reconcile their findings,
apply code-as-ground-truth, and write the pre-flight and the Investigation Log
from what they return. If an MCP-backed agent reports its source unavailable,
record that in the log rather than treating it as empty.

## Step 2: Run the actual investigation

Only AFTER the pre-flight is filled in do you proceed with:

- The Investigation Log table (Step 4.5 of CLAUDE.md)
- The Resolution Research (CLAUDE.md Step 2): for any recurring pattern,
  surface how prior instances were ACTUALLY fixed (root cause + the
  remediation that closed them + who/where + whether a permanent fix
  shipped). Build a short Resolution Playbook and lead the synthesis with it.
- The synthesis (Step 5)
- The drafted client reply with no signature (Step 6)
- The confidence note (Step 7)

## Hard rules for this turn

1. **No skipped sources without a written reason.** A `❌` row needs an
   in-line justification, not silence.
2. **Every load-bearing claim in the draft must trace to a numbered claim
   in the pre-flight.** If a sentence in the draft has no upstream pre-flight
   entry, delete it or add the source.
3. **No inference-flavored prose.** "Typically," "likely," "platform-level,"
   "should be," "we usually" — banned unless prefixed with "I'm inferring"
   and listed in the pre-flight as a VERIFY source.
4. **Grep peach-main + peach-front + peach-docs for any API capability
   question.** Don't lean on session memory. Memory is point-in-time;
   code drifts.
5. **Cross-check the lender quirks file** at
   `~/.claude/projects/-Users-nai-Downloads-peach-main/memory/peach_lender_quirks.md`
   before drafting. If the ticket is from a lender with an entry, name
   the entry in the pre-flight.
6. **Voice rules from CLAUDE.md apply to everything** — no em dashes, no
   en dashes, no ` - ` connectors, no banned marketing words, no
   abbreviations beyond `auth` and `OTB`.
7. **End with the confidence stamp** (✅ Verified / ⚠️ Contradiction /
   📭 Undocumented / ❓ Uncertain). ✅ requires every consulted source to
   agree; if any source is silent or contradicting, downgrade.

If at any point you find yourself about to skip the pre-flight because
"this one's simple," that is exactly the failure mode this command exists
to prevent. Print the pre-flight. Then decide if it's simple.
