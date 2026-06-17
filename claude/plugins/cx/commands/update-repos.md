---
description: Pull latest on peach-main, peach-front, peach-docs and reindex BM25
argument-hint: (no args; pass "skip-index" to skip the BM25 rebuild)
model: claude-opus-4-6
---

# Update local Peach repos — $ARGUMENTS

Pull the latest commits on the three local Peach repos and rebuild the
BM25 search index so grep + KB results reflect HEAD.

## Step 1: Pull all three repos in parallel

Run all three in a single Bash call (no sequential dependency):

```
for d in peach-main peach-front peach-docs; do
  echo "=== $d ===";
  cd /Users/nai/Downloads/$d && \
    echo "before: $(git log -1 --oneline)" && \
    git fetch --all --prune 2>&1 | tail -3 && \
    git pull --ff-only 2>&1 | tail -3 && \
    echo "after:  $(git log -1 --oneline)";
done
```

## Step 2: Print a per-repo summary table

Report in this exact shape — one row per repo:

| Repo | Before | After | Status |
|---|---|---|---|
| peach-main | <short SHA + subject> | <short SHA + subject> | up-to-date / advanced / behind / error |
| peach-front | ... | ... | ... |
| peach-docs | ... | ... | ... |

If a repo failed to fast-forward (non-trivial rebase needed, conflicts,
uncommitted changes), report it clearly and STOP. Do not force-pull. Tell
Nicolas what to clean up so he can decide.

## Step 3: Rebuild BM25 index (unless `$ARGUMENTS` is "skip-index")

After successful pulls, run:

```
cd /Users/nai/Downloads/peach-main && python3 scripts/peach_kb.py index 2>&1 | tail -5
```

Report total chunks indexed so the user can confirm the rebuild ran.

## Step 4: Surface notable changes since last update

If either peach-front or peach-main advanced by more than a handful of
commits, run a quick `git log --oneline` over the new range and surface
any commits that look CX-relevant. Examples of what to flag:

- New endpoints (paths added in OpenAPI)
- Smart Reviews / cases / templates / webhooks changes
- Feature flag rollouts
- Migration files (schema changes)
- Anything tagged with an SC story that matches an open ticket

Use this exact prose pattern: "Worth knowing: <commit subject> (<sha>)
might affect <topic>."

Skip this step if fewer than 5 new commits per repo.

## Voice rules apply

No em dashes, no en dashes, no ` - ` connectors. Plain table, plain prose.
Don't preamble with "let me pull the repos." Just run and report.
