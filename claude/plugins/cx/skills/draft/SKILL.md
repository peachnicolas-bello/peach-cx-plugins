---
name: draft
description: Draft a CX response (client reply, holding reply, internal routing, or eng ask) from the investigation findings in the current session. Runs a drafter then a voice auditor. Use when the user says /draft or asks to draft a response.
model: claude-opus-4-6
---

# Draft a CX response

Produce a ready-to-paste draft from whatever investigation, debug report, or
ticket context exists in this session. Two agents run sequentially: one drafts,
one audits for voice-rule violations and rewrites if needed.

## Prerequisites

There must be investigation findings, a debug report, a precedent match, or at
minimum a ticket subject and conversation already in this session. If none of
these exist, tell the user to run `/investigate` or `/follow-up` first and stop.

## Step 1: Gather context

Collect everything established in this session that the drafter needs:

- The ticket number, subject, and requester name.
- The Ask / Problem / Want triple if one was produced.
- Investigation log findings (code citations, precedent matches, Slack threads).
- Debug report diagnosis if one was produced.
- Resolution playbook if one was produced.
- Any VERIFY blocks that are still unresolved.
- The lender name and SE owner if known.

Assemble this into a single context block. Do not re-run investigations or
searches. Use what is already in the session.

## Step 2: Spawn the response-drafter agent

Pass the context block to the `cx:response-drafter` agent. The agent will:
1. Determine the draft type (A client, B holding, C internal routing,
   D diagnostic ask).
2. Write the draft following all voice and shape rules.
3. Return the draft with its type and target.

## Step 3: Spawn the voice-auditor agent

Pass the drafter's output (the full draft text and its type) to the
`cx:voice-auditor` agent. The agent will:
1. Check every voice rule against the draft.
2. Return PASS or FAIL with numbered violations and a corrected draft.

## Step 4: Present results

If the auditor returned PASS, present the draft to the user as ready to send.

If the auditor returned FAIL, present the corrected draft as the primary
output. Below it, show the violation summary so the user can see what was
caught and fixed.

Output format:

```
DRAFT — ZD #<ticket> — Type <A|B|C|D>
Target: <Zendesk reply | Slack #channel-name>

---

<the final draft (corrected version if auditor caught violations, original if PASS)>

---

Voice audit: <PASS | FAIL — N violation(s) corrected>
<if FAIL, compact list of what was caught: one line per violation>
```

## Rules

- Do not add a signature block. Zendesk auto-appends it.
- Do not add preamble before the draft output.
- If there are unresolved VERIFY blocks in the session, the draft MUST be
  Type B (holding) or Type D (diagnostic ask). Do not draft a definitive
  client answer (Type A) when a load-bearing claim is unverified.
- If the draft is Type C or D (Slack), name the target channel based on the
  internal routing rules: `#eng-loan-servicing-questions` for repayment
  engine topics, `#eng-loan-management-questions` for permissions/config/
  settlement, `#webhooks` for webhook issues, `#backend` for events/replica/
  platform, `#on-call` for active prod issues, `#cx-questions` for general
  triage, `#product-questions` for product calls.
- Voice rules from the protocol apply to this skill's own output too. No em
  dashes, no en dashes, no ` - ` connectors.
