# Contributing to Career-Ops India

Thanks for your interest in contributing. This is a focused tool — contributions that stay within that scope are most likely to be merged.

## What belongs here

- Bug fixes and edge-case handling in the pipeline
- Improved agent prompts (better ATS pass-through, cleaner JD parsing, etc.)
- New output formats (e.g. plain-text resume, JSON export)
- Performance improvements (prompt caching, token reduction)
- Better error messages and user-facing UX
- Documentation corrections

## What does not belong here

- Adding new dependencies without strong justification
- Replacing the Anthropic SDK with another provider
- UI frameworks or web servers — this is a CLI tool
- Features that require storing user data externally

## Getting started

```bash
git clone https://github.com/Justinsharon/career-ops-india
cd career-ops-india
npm install
cp .claude/settings.example.json .claude/settings.json
# Add your ANTHROPIC_API_KEY to .claude/settings.json
node pipeline.js
```

## Making a change

1. Fork the repo and create a branch: `git checkout -b fix/your-description`
2. Make your change — keep the scope tight
3. Test it end-to-end with a real CV and JD
4. Open a PR with a clear description of what changed and why

## Prompt changes

If you're editing a system prompt in `agents/prompts.js`, explain in the PR:
- What output quality problem you observed
- What you changed and why it fixes it
- A before/after example (redact any personal data)

## Code style

- ESM (`import`/`export`) throughout — no `require()`
- No TypeScript — plain JS only
- No new build steps
- `console.error` for errors, `chalk` for terminal colour
- JSON-returning agents must keep the `CRITICAL OUTPUT RULE` block intact

## Commit messages

Keep them short and factual. One sentence is fine.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
