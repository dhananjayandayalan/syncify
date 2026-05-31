# LEGACY_MODERNIZATION_GUIDE.md

## Legacy Mission

Modernize old systems safely without breaking production behavior.

## Primary Rule

Preserve behavior first. Improve architecture second.

## Legacy Workflow

1. Understand existing behavior.
2. Identify safest change seam.
3. Add characterization tests.
4. Add observability if missing.
5. Make smallest safe change.
6. Refactor only within protected boundaries.
7. Introduce modern standards incrementally.
8. Use strangler migration for major replacement.

## Do Not

- Rewrite everything.
- Upgrade all dependencies at once.
- Introduce new architecture without migration plan.
- Change public APIs without compatibility plan.
- Replace working code for style only.
- Add experimental features to fragile build systems.
- Assume old code is wrong without tests.

## Safe Modernization Order

1. Formatting.
2. Linting.
3. Type safety.
4. Tests around critical flows.
5. Error handling.
6. Security fixes.
7. Dependency updates.
8. Folder/module boundaries.
9. Performance improvements.
10. Architecture migration.

## Legacy Risk Categories

Safe now:

- Dead code removal with tests.
- Typing boundaries.
- Centralized constants.
- Small validation improvements.
- Logging improvements without sensitive data.

Safe after tests:

- Extracting business logic.
- Refactoring large functions.
- Replacing duplicated logic.
- Updating critical dependencies.

Safe during planned migration:

- Framework upgrades.
- Architecture replacement.
- Database schema redesign.
- State management replacement.

Risky:

- Full rewrites.
- Big bang microservices.
- Replacing authentication system without migration.
- Updating major framework versions without compatibility matrix.
