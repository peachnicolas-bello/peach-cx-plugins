---
description: Answer an API capability question with grep evidence, not inference
argument-hint: <the question>
model: claude-opus-4-6
---

# API question — grep peach-main + peach-front + peach-docs, cite or VERIFY

Question: $ARGUMENTS

This command exists because of the Decagon failure (ZD #5762) where an
inference-flavored answer slipped past the Precision rule. For this turn,
the answer is grounded in grep evidence or it is a VERIFY block. No third
option.

## Step 1: Print the grep manifest BEFORE answering

```
GREP MANIFEST — $ARGUMENTS

Patterns I will run
  peach-main   : grep -rn "<pattern>" --include="*.py" peach/
  peach-front  : grep -rn "<pattern>" <relevant subtree>
  peach-docs   : grep -rn "<pattern>" .

Results (file:line for each hit that backs a claim)
  peach-main   : <list>
  peach-front  : <list or "no hits — justified by ...">
  peach-docs   : <list or "no hits — justified by ...">
```

## Step 2: Run the greps and fill in the manifest

Use the Bash tool. Actually run the commands. Do not paraphrase what the
code "probably" does. Read the lines you cited and quote them if the
client-facing answer hinges on a specific value (a rate limit number, a
permission string, a header name, an endpoint path).

## Step 3: Write the answer

Each sentence in the answer is one of:

1. **Grounded:** Followed by or referencing a `repo/file.py:LINE` citation
   from the manifest.
2. **VERIFY:** Prefixed with "I'm inferring" or wrapped in a VERIFY block,
   with the specific question to confirm with engineering.

Banned in the answer body: "platform-level," "typically," "likely,"
"should be," "we usually," "in practice," any hedge that hides a missing
citation.

## Step 4: Surface the integrator's next question

After the direct answer, name the one or two operationally important
gotchas the asker hasn't asked yet but will hit. Examples:
- For rate limits: whether `X-RateLimit-*` headers are returned.
- For key rotation: whether the full secret is shown only on creation.
- For webhooks: whether retries are exponential and how long the queue holds.
- For idempotency: what the system returns on duplicate (409 vs 400 vs 200).

That extra layer is the difference between an inference-grade answer and
the "feels human" answer Nicolas's colleague wrote on Decagon.
