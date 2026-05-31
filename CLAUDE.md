# CLAUDE.md

This file exists to remind the Claude assistant to follow the workspace agent protocol defined in `AGENTS.md`.

Prompt:

- Before doing any task, read `AGENTS.md` completely.
- Follow the Mandatory Agent Startup Protocol in `AGENTS.md`.
- Load only the context that the task needs, using the rules in `AGENTS.md`.
- Prefer the newest stable production-ready features, official recommendations, and fewer dependencies.
- Preserve behavior for legacy code, introduce changes incrementally, and avoid new architecture unless justified.
- Use the lowest-token workflow that still produces a correct solution.
- Do not introduce unrelated rewrites or security shortcuts.
- If files are missing, ask for them instead of guessing.
