---
title: Let an AI write your Kaury site
description: One prompt, one spec file, one compiler that explains its errors. A loop that turns Claude, ChatGPT or Cursor into a reliable web developer.
date: 2026-10-06
minutes: 3
tag: AI
---

Kaury was designed so that a language model can write it well: one way to do each thing, the same shape on every line, a whole site in a few dozen lines.

## The prompt

```text
Read https://kaury.dev/kaury-ai.md — the full specification of the Kaury language.
Then write a complete Kaury site (one site.kaury file) for: a bakery in Lisbon,
with a 3D croissant, the menu, opening hours and a contact form.
```

`kaury-ai.md` is about 300 lines. It holds the syntax, the web elements, styles, animations, 3D and a list of golden rules. Assistants that browse can read the address; for the others, paste the file.

## The loop

1. Save the answer as `site.kaury`.
2. Run the checker:

```bash
kaury check --json
```

3. If there are errors, give the JSON back to the assistant. Each error has the line, the column, the word and the fix:

```json
{ "severity": "error", "file": "site.kaury", "line": 4, "column": 20, "message": "\"conut\" does not exist.", "fix": "did you mean \"count\"?" }
```

4. Repeat until `kaury check` is green, then `kaury dev`.

An agent such as Claude Code or Cursor can run this loop on its own.

## Why it works better than JavaScript

- **Less to write, less to get wrong**: a full site is one answer, not twenty files.
- **No version soup**: there is no React 17 vs 19, no router to choose, no CSS framework to guess.
- **A strict compiler**: mistakes are caught before the browser, with a fix the model can apply.

**Start:** [read kaury-ai.md](/kaury-ai.md) · [see the files made for AIs](/for-ai/)
