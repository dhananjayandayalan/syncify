# ENTERPRISE_CODING_BRAIN.md

## Mission

Create enterprise-grade software using modern stable technologies, strong security, low-token AI workflows, and architecture that fits the actual application requirement.

This brain applies to:

- Frontend: React, Angular, Vue, Vanilla JavaScript, TypeScript, CSS.
- Backend: Java, Spring Boot, Python, Django, FastAPI, JavaScript/TypeScript, Node.js, NestJS, Go, Ruby, Rails, Scala, Play, ZIO.
- Databases: PostgreSQL, MySQL, SQLite, Redis, MongoDB, CockroachDB, YugabyteDB, ClickHouse, Elasticsearch/OpenSearch, DuckDB and other fit-for-purpose databases.
- Infrastructure: Docker, Kubernetes, CI/CD, observability, security, secrets, deployment.
- Architecture: layered, modular monolith, clean architecture, hexagonal architecture, event-driven, microservices, microfrontends, serverless, edge, distributed systems.

## Golden Rule

Do not chase trends. Use modern stable features when they improve correctness, safety, speed, maintainability, developer experience, or cost.

## Architecture Selection Rule

Always choose the simplest architecture that satisfies:

1. Business requirement
2. Team size
3. Deployment maturity
4. Security/compliance needs
5. Scalability requirement
6. Data consistency requirement
7. Integration complexity
8. Expected product lifetime

Prefer this order:

1. Simple app
2. Layered architecture
3. Modular monolith
4. Clean/hexagonal architecture
5. Event-driven modular monolith
6. Microservices
7. Distributed event-driven microservices

Microservices, Kubernetes, distributed SQL, and microfrontends are not automatically “enterprise”. They are tools for specific constraints.

## Modern Stable Innovation Rule

For new projects:

- Use newest stable language/framework features.
- Use official recommended patterns.
- Use fewer dependencies.
- Use compile-time and runtime validation.
- Use design systems and tokens for UI.
- Use secure defaults.
- Use observability from day one.
- Use TDD for core business logic and critical flows.

For legacy projects:

- Do not break behavior.
- Add characterization tests.
- Refactor around seams.
- Introduce adapters/facades.
- Use strangler migration for big changes.
- Do not introduce unstable new tools into fragile build systems.

## Default Delivery Standard

Any generated solution must consider:

- Implementation
- Types
- Validation
- Security
- Authorization
- Error handling
- Tests
- Accessibility if UI
- Performance
- Observability
- Documentation
- Migration impact
- Token cost
