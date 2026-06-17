---
description: Suggest the right Zendesk tags for a ticket from Peach's canonical tag list
argument-hint: <ticket-number>
model: claude-opus-4-6
---

# Suggest Zendesk tags for ZD #$ARGUMENTS

Suggest the tags that belong on Zendesk ticket #$ARGUMENTS, drawn ONLY from
Peach's canonical tag list. Never invent a tag.

## Source of truth

The canonical tag list lives in the Google Sheet
`1kEk_IL6T-fBsZOgGQ7VthqbhcamD257E-SckplXSh-E`
(https://docs.google.com/spreadsheets/d/1kEk_IL6T-fBsZOgGQ7VthqbhcamD257E-SckplXSh-E/edit).

Step 1, every run: read the live sheet with the Google Drive tool
`read_file_content` on that file id. The sheet is the source of truth because
tags are added over time and a tag unused for 60 days drops off the
suggested list. If Drive is unreachable, fall back to the snapshot in
`~/.claude/projects/-Users-nai-Downloads-peach-main/memory/peach_zendesk_tags.md`
and say so explicitly in the output.

## Hard rules

1. **Only suggest tags where `In Use` is TRUE.** Skip any row marked FALSE
   (for example `deferment`, `interest_accrual`, the engineering `config`
   row). If a topic has no matching canonical tag, say so rather than
   inventing one.
2. **Do not suggest the Zendesk-workflow auto-applied tags.** These are set
   by ticket type and solve state, not chosen manually: `customer_solved`,
   `general_solved`, `pc`, `pq`, `pr`, `product_concern`, `product_question`,
   `product_request`, `solved_bug`, `solved_completed`,
   `solved_expected_behavior`, `pagerduty`. Mention them only if relevant as
   context, never as a manual add.
3. **Suggest the smallest set that actually fits.** Over-tagging is worse
   than under-tagging. Aim for the few tags that capture the ticket's real
   subject, not every tag that is loosely adjacent.
4. **Map to the sheet's intended reference, not the tag name alone.** Use the
   "Intended Reference and Application" column to confirm a tag fits before
   suggesting it.
5. **Flag tags already on the ticket** so Nicolas does not re-add them, and
   note any current ticket tag that is not part of the canonical list (for
   example `mp_client`, `hp_client`, `strategic_client`, `update_existing`,
   `create_new` are org or request-type tags, not subject tags).

## Steps

1. Read the live sheet (Step 1 above).
2. Pull the ticket with `zendesk_get_ticket_details` on $ARGUMENTS. Read the
   subject and the full conversation, public and private.
3. Extract the real subjects: feature, surface, transaction type, lifecycle
   stage, channel, lender context.
4. Match each subject to a canonical TRUE tag using the intended-reference
   column. Discard loose adjacencies.
5. Output the result in this shape:

```
TAGS — ZD #$ARGUMENTS  (source: live sheet | snapshot fallback)

Already on ticket: <existing tags, marking which are canonical subject tags
vs org/request-type tags>

Suggested tags:
- <tag> — <one line: why it fits, anchored to the ticket>
- <tag> — <...>

Considered but not adding:
- <tag> — <one line: why it is a near-miss, not a fit>
```

6. Keep it tight. No preamble. Voice rules apply (no em dashes, no en
   dashes, no ` - ` connectors).
