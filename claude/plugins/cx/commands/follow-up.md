---
description: Read state on a mid-flight ticket and draft the next move
argument-hint: <ticket-number>
model: claude-opus-4-6
---

# Follow-up on ZD #$ARGUMENTS — state synthesis, next-move draft

You are running a follow-up cycle on ZD #$ARGUMENTS. This command is
different from `/investigate`. Use this when the ticket has been in flight
for multiple rounds and the question is not "what is the answer" but "where
does this stand and what do I send next."

## Step 1: Print the follow-up pre-flight

The first thing in your response must be this block, filled in. No
preamble.

```
FOLLOW-UP — ZD #$ARGUMENTS

Current state
  Last comment by:        <name + role (Peach / lender / SE)>
  Last comment date:      <YYYY-MM-DD>
  Days since last action: <number>
  Who is the next move on: Peach side / lender side / SE / product / eng

Open threads (questions still unanswered)
  1. <one line, dated to the comment that raised it>
  2. ...

Sources consulted (✅ ran, ❌ skipped + why)
  [ ] Zendesk ticket details      → full thread read
  [ ] Linked Shortcut stories     → searched by ZD URL + lender + topic
  [ ] Slack permalinks in ticket  → followed each
  [ ] Slack search on topic       → query used
  [ ] Lender quirks file          → which row, what was relevant
  [ ] Prior session memory        → which earlier ticket / note applies

Where the ticket is stuck (one sentence)
  <Specific bottleneck. Not "waiting on Peach" — name the person /
  channel / decision.>
```

## Step 2: Pull the artifacts (in this order)

Use the MCP tools available:

1. **`zendesk_get_ticket_details`** on `$ARGUMENTS`. Read every comment,
   public and private, to reconstruct the timeline.
2. **`stories-get-by-external-link`** with the ticket URL
   (`https://peachfinance.zendesk.com/agent/tickets/$ARGUMENTS`). If a
   Shortcut story is linked, pull its full body and comments via
   `stories-get-by-id`.
3. **`stories-search`** with 2-3 keyword combinations covering the lender
   + topic. Often a related story exists even when none is linked to the
   ticket URL.
4. **`slack_search_public_and_private`** with the ticket number, lender
   name + topic, and any specific IDs in the thread (loan IDs, story
   numbers, user IDs).
5. **MANDATORY: read the full Slack thread for any engineer named on
   the ticket.** If the ticket history mentions a Peach engineer (Julia,
   Chris Wilcox, Eddie, Russell, Brad, Amanda, Satoru, etc.), use
   `slack_read_thread` on the latest thread where they engaged with this
   ticket. Quote their final conclusion verbatim in the synthesis. Do
   not summarize or paraphrase their conclusion; quote it. This is the
   load-bearing source for "where the ticket is stuck" and "what is the
   next move." Skipping this step is the single most common cause of a
   stale follow-up draft.
5. **Code grep** ONLY if the follow-up turns up a load-bearing claim that
   has no source yet. Otherwise skip — this is a state-sync, not a fresh
   investigation.

## Step 3: Build the timeline table

After the pre-flight, print a compact timeline of every back-and-forth on
the ticket. Format:

```
| Date       | Actor          | Action / Comment                        |
|------------|----------------|-----------------------------------------|
| 2026-05-14 | Lender (Quincy)| Opened with idempotency question        |
| 2026-05-14 | Peach (you)    | externalId is the safe-retry mechanism  |
| 2026-05-19 | Lender         | Deep-dive on check-instrument 400; ask  |
|            |                | for auth perm grant                     |
| 2026-05-27 | Peach (Brad)   | Added perms to admin role               |
| 2026-06-01 | Lender         | Expanded scope to back-office-agent     |
| 2026-06-?? | (your move)    | Pending                                 |
```

Keep it tight. One row per meaningful action.

## Step 4: Decide the next-move type

After the timeline, pick ONE of these and produce the matching artifact:

**Type A: Client draft.** Use when we have a defensible answer to every
open thread and the next action is sending Quincy / Danielle / Erica a
substantive reply. Voice rules apply (no em dashes, no en dashes, no
`-` connectors, no marketing words, greeting Hi <name>, no sign-off).

**Type B: Holding reply.** Use when we're waiting on Peach-side action
(eng, product, SE) but the client deserves an acknowledgment. Two to
three sentences. No promises of dates. Tell the client what's next on
our side, briefly.

**Type C: Internal-routing draft.** Use when the next move is on the
Peach side and the question needs to go to a specific person or channel.
Produce the Slack post or the internal note using the matching rules
(`/product-question` for product, voice rules for SE pings, etc.). Link
the ticket.

**Type D: Diagnostic ask.** Use when the lender's previous reply was
incomplete and we need specific data points before we can proceed.
Frame as one short paragraph plus a numbered list of what we need.

State explicitly which type you chose and why. Do NOT silently produce
a Type A when a Type B is correct.

## Step 5: Surface the gaps

After the artifact, a 2-3 line "what's still missing" block. Format:

```
Gaps to close before this ticket can resolve:
- <one line>
- <one line>

Suggested next action after this turn: <one sentence>
```

This is the audit trail item Nicolas uses to decide whether to send
what's drafted or wait.

## Hard rules

1. **No fabricated state.** Every claim in the timeline traces to a real
   Zendesk comment, Slack permalink, Shortcut story, or quirks-file
   entry. If you can't source it, leave it out.
2. **Voice rules apply** to every draft. No em dashes, no en dashes,
   no ` - ` connectors, no abbreviations beyond `auth` and `OTB`.
3. **Permalinks mandatory** for internal output. Slack threads, Shortcut
   stories, related Zendesk tickets all get full URLs.
4. **In client-facing drafts**, never name another lender's third-party
   integration. Reference precedents generically.
5. **No silent assumptions about what the lender wants.** If the
   ticket's recent comment was ambiguous, choose Type D (diagnostic ask)
   rather than guessing.
6. **End with the confidence stamp** (✅ Verified / ⚠️ Contradiction /
   📭 Undocumented / ❓ Uncertain) on the drafted artifact only.
   The state synthesis itself does not need a stamp.

## Why this command exists

Tickets like ZD #5714 (Wisetack check processing, 9 rounds) and ZD #5742
(Tilt dispute display, FinWise compliance pressure) accumulate state
faster than I can hold in working memory across sessions. `/investigate`
is wrong for these because the question is no longer "what is the
answer." It is "what is the current ball-in-court and what do I send
to advance it."
