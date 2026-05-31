# TOOL_SELECTION_PLAYBOOK.md

## Tool Selection Mission

Always find the newest stable tool that fits the application need, but never choose novelty over reliability.

## Evaluation Criteria

Before choosing any language, framework, package, database, or infrastructure tool, evaluate:

1. Requirement fit.
2. Stability.
3. Maintenance activity.
4. Security history.
5. Ecosystem maturity.
6. Team familiarity.
7. Documentation quality.
8. Operational complexity.
9. Performance profile.
10. Long-term support.
11. Migration/exit cost.
12. License.
13. Community adoption.
14. Compatibility with existing architecture.
15. Token efficiency for AI-assisted development.

## Tool Categories

### Use platform feature first

Prefer built-in language/runtime/framework features before third-party packages when:

- The built-in feature is stable.
- It is well documented.
- It reduces dependency risk.
- It keeps code simpler.

### Add dependency when

- It solves a real problem.
- It is widely used or clearly high quality.
- It has active maintenance.
- It has strong docs.
- It reduces code/security risk.
- It does not dominate architecture unnecessarily.

### Avoid dependency when

- It is abandoned.
- It duplicates platform capability.
- It is too magical.
- It has poor types.
- It bloats bundle/runtime.
- It creates lock-in without benefit.
- It is unnecessary for the app scale.

## Architecture Tool Fit

Do not use:

- Kubernetes for simple apps unless learning/platform requires it.
- Microservices for small teams without operational maturity.
- Microfrontends for single-team apps.
- Distributed SQL for simple single-region CRUD.
- Global state libraries for local component state.
- Heavy backend frameworks for small scripts.
- Frontend frameworks for mostly static pages.

## Contemporary Architecture Methodologies

Use where appropriate:

- Modular monolith.
- Clean architecture.
- Hexagonal architecture.
- Domain-driven design.
- Event-driven architecture.
- CQRS only when read/write models truly differ.
- Outbox pattern for reliable event publishing.
- Saga pattern for distributed workflows.
- Backend for frontend when clients need different API shapes.
- Edge rendering only when latency/SEO/user geography justify it.
- Serverless for bursty workloads and low ops, with cold-start/vendor tradeoff understood.
