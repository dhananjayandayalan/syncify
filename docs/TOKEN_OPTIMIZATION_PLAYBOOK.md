# TOKEN_OPTIMIZATION_PLAYBOOK.md

## Goal

Use Claude Pro, Codex, Cursor, Continue, and local LLMs with the lowest token usage while preserving enterprise-grade output.

## Universal Low-Token Prompt

```txt
Task: <specific outcome>
Context: <short app/module context>
Files provided: <only relevant files>
Rules: Follow AGENTS.md and relevant docs.
Output: Minimal patch/diff only. Do not repeat unchanged code.
Token mode: Be concise. Ask for missing files instead of guessing.
Quality: No warnings, secure, tested, maintainable.
```

## Before Asking an Agent

Do:

1. Give file tree.
2. Give only relevant files.
3. State exact task.
4. State constraints.
5. Ask for minimum required files if unsure.
6. Ask for patch, not full rewrite.

Do not:

- Paste entire repo.
- Paste unrelated logs.
- Paste generated files.
- Ask broad questions like “improve this project”.
- Ask for multiple architectures unless needed.
- Ask for explanations when you need implementation.

## Agent Execution Protocol

```txt
1. Identify smallest scope.
2. Read only relevant files.
3. Inspect existing conventions.
4. Propose smallest safe plan.
5. Apply focused patch.
6. Run/describe tests.
7. Report changed files, risks, and next step.
```

## For Claude Pro

Use Claude for:

- Architecture review.
- Complex refactors.
- Large-file reasoning.
- Migration planning.
- Security review.
- Debugging with logs.

Avoid using Claude for:

- Formatting.
- Simple boilerplate.
- Repetitive CRUD.
- Large dependency docs pasted manually.
- Tasks local tools can do.

Use local LLM for:

- Autocomplete.
- Small refactors.
- Test generation drafts.
- Documentation drafts.
- Simple bug fixes.

## Token-Saving Repository Setup

Keep these files in repo root/docs:

- `AGENTS.md`
- `ENTERPRISE_CODING_BRAIN.md`
- `docs/FRONTEND_STANDARDS.md`
- `docs/BACKEND_STANDARDS.md`
- `docs/DATABASE_STANDARDS.md`
- `docs/SECURITY_STANDARDS.md`
- `docs/INFRASTRUCTURE_STANDARDS.md`
- `docs/TESTING_STANDARDS.md`
- `docs/LEGACY_MODERNIZATION_GUIDE.md`
- `docs/TOOL_SELECTION_PLAYBOOK.md`

Then prompts can say:

```txt
Follow repo standards. Load only docs relevant to this task.
```

## Low-Token Output Format

```txt
Changed:
- file: change

Why:
- reason

Tests:
- run or recommended

Risks:
- only real risks

Need:
- missing file/context, if blocked
```
