# AGENTS.md

## Mandatory Agent Startup Protocol

Before performing any task:

1. Read this file completely.
2. Read `ENTERPRISE_CODING_BRAIN.md`.
3. Read relevant docs from `docs/`.
4. Read `ARCHITECTURE_DECISIONS.md` if it exists.
5. Read `IMPLEMENTATION_PLAN.md` if it exists.
6. Inspect existing project conventions before generating code.
7. Do not introduce new architecture without explaining why.
8. Ask for missing files instead of guessing.
9. Use the lowest-token workflow that can still produce a correct solution.

## Context Loading Rules

Load only what the task needs:

- UI task: `FRONTEND_STANDARDS.md`, `TESTING_STANDARDS.md`, `SECURITY_STANDARDS.md` if auth/input involved.
- Backend task: `BACKEND_STANDARDS.md`, `DATABASE_STANDARDS.md`, `SECURITY_STANDARDS.md`, `TESTING_STANDARDS.md`.
- Infrastructure task: `INFRASTRUCTURE_STANDARDS.md`, `SECURITY_STANDARDS.md`.
- Legacy task: `LEGACY_MODERNIZATION_GUIDE.md` first.
- Tool/package choice task: `TOOL_SELECTION_PLAYBOOK.md`.
- Large task: create/update `IMPLEMENTATION_PLAN.md` before editing code.

## Modern Stable Feature Policy

For new applications, new modules, and isolated rewrites:

- Prefer the newest stable production-ready features.
- Prefer official framework recommendations.
- Prefer language-level and platform-level features before third-party packages.
- Prefer fewer dependencies with stronger architecture.
- Prefer stable modern standards over outdated boilerplate.
- Avoid experimental, deprecated, unstable, or hype-driven features unless explicitly requested.

For legacy code:

- Do not blindly apply modern patterns.
- Preserve behavior first.
- Add tests before risky refactors.
- Introduce modernization incrementally.
- Prefer compatibility over novelty.

## Token Optimization Rules

For Claude Pro, Codex, Cursor, Continue, or local LLMs:

1. Never request the full repository unless absolutely necessary.
2. Ask for file tree first.
3. List the minimum files needed.
4. Return diffs or focused patches.
5. Do not repeat unchanged code.
6. Do not explain basics unless requested.
7. Avoid multiple options when one strong recommendation is enough.
8. Stop and ask for missing files instead of hallucinating.
9. Summarize assumptions in 3 lines or fewer.
10. Final response format should be short:

```txt
Changed:
- file: change

Why:
- reason

Tests:
- run/needed

Risks:
- real risks only
```

## Non-negotiable Quality Rules

- No security shortcuts.
- No hardcoded secrets.
- No localStorage for sensitive tokens.
- No server-side authorization gaps.
- No deprecated APIs.
- No warnings.
- No dead code.
- No unrelated rewrites.
- No giant files.
- No over-engineering.
- No framework unless the requirement justifies it.
- If vanilla JavaScript is enough, use vanilla JavaScript.
