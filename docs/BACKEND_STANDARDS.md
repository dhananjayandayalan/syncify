# BACKEND_STANDARDS.md

## Backend Mission

Build secure, reliable, observable, scalable, and maintainable backend systems using the simplest architecture that satisfies the requirement.

## Backend Architecture Defaults

Use:

- Controller/router layer for transport.
- Application/service layer for use cases.
- Domain layer for business rules.
- Repository/gateway layer for persistence/integrations.
- Infrastructure layer for framework-specific implementation.
- DTOs at boundaries.
- Runtime validation at all external inputs.
- Centralized error handling.
- Structured logs.
- Request/correlation IDs.
- Health checks and metrics.

## Java Standards

Use modern stable Java:

- Use current LTS Java for enterprise applications unless project policy differs.
- Use records for immutable DTOs/value carriers.
- Use sealed classes/interfaces for controlled hierarchies.
- Use pattern matching where stable and readable.
- Prefer immutable data.
- Prefer constructor injection.
- Avoid null-heavy APIs.
- Use Optional for return values only when helpful.
- Keep business logic out of controllers.
- Use Bean Validation for input DTOs.
- Use virtual threads only when supported by the chosen stack and load profile.
- Avoid reflection-heavy magic unless framework-supported and necessary.

## Spring Boot Standards

Use Spring Boot for enterprise Java APIs when:

- Team needs mature ecosystem.
- Security, transactions, observability, and integration maturity matter.
- Strong conventions are useful.

Rules:

- Thin controllers.
- Service/application layer owns use cases.
- Repository layer owns persistence.
- DTOs separate from entities.
- Centralized exception handling.
- Configuration properties instead of scattered env reads.
- Spring Security for auth.
- Method-level authorization where useful.
- Transactions at service boundaries.
- Actuator health/metrics for production.
- Flyway/Liquibase for migrations.
- Testcontainers for integration tests.
- Avoid exposing JPA entities directly.
- Avoid lazy loading in serialization.
- Avoid massive service classes.

## Python Standards

Use modern stable Python:

- Type hints for serious code.
- `dataclasses` or Pydantic models where appropriate.
- `pathlib` for paths.
- `enum.StrEnum` where useful.
- Pattern matching only when it improves clarity.
- Virtual environments or uv/poetry-managed environments.
- Ruff for linting/formatting when accepted.
- Pyright or mypy for type checking.
- Avoid dynamic magic in core business logic.
- Keep IO at boundaries.

## Django Standards

Use Django when:

- Admin, ORM, auth, forms, and batteries-included productivity matter.
- The application is data-heavy and convention-friendly.

Rules:

- Keep views thin.
- Put business logic in services/domain modules.
- Avoid fat models for complex domains.
- Use Django ORM intentionally.
- Use migrations for all schema changes.
- Use Django security middleware.
- Use class-based or function views based on clarity.
- Use DRF only when API complexity justifies it.
- Avoid putting secrets in settings.
- Split settings by environment safely.
- Use select_related/prefetch_related to avoid N+1.

## FastAPI Standards

Use FastAPI when:

- API-first Python service.
- High performance with async support.
- Type-driven request/response contracts matter.

Rules:

- Use Pydantic models for validation.
- Keep route handlers thin.
- Separate routers, services, repositories, schemas, dependencies.
- Use async only when the underlying IO stack is async.
- Avoid mixing sync blocking work in async routes.
- Use dependency injection carefully.
- Centralize error handling.
- Add OpenAPI docs hygiene.
- Use background tasks only for lightweight tasks; use a queue for durable jobs.

## JavaScript/TypeScript Backend Standards

Use Node.js/TypeScript when:

- IO-heavy API.
- Full-stack TypeScript productivity matters.
- Real-time or event-driven workloads matter.
- Team is strong in JS/TS.

Rules:

- Use Active LTS Node.js.
- Use TypeScript strict mode.
- Validate environment at startup.
- Validate request inputs.
- Keep handlers thin.
- Separate routes/controllers/services/repositories.
- Use structured logging.
- Avoid blocking event loop.
- Use AbortController/timeouts for outbound calls.
- Avoid unbounded concurrency.
- Avoid global mutable state.
- Use worker threads or queues for CPU-heavy work.

## NestJS Standards

Use NestJS when:

- Enterprise Node.js structure is needed.
- Dependency injection and modules help team scale.
- Backend has multiple domains.

Rules:

- Modules by domain.
- Controllers thin.
- Providers/services for use cases.
- Guards for authentication/authorization.
- Pipes for validation.
- Interceptors for cross-cutting concerns.
- Exception filters for consistent errors.
- Avoid circular dependencies.
- Avoid anemic mega-modules.

## Go Standards

Use Go when:

- Simple, fast, reliable services are needed.
- Concurrency and deployment simplicity matter.
- Small binaries and operational clarity matter.

Rules:

- Use standard library first.
- Keep packages small and purpose-driven.
- Accept interfaces at boundaries, return concrete types when appropriate.
- Pass context through request-scoped operations.
- Handle every error explicitly.
- Avoid panic for normal errors.
- Use structured logging.
- Use `errgroup` for coordinated concurrency where useful.
- Avoid global state.
- Prefer simple architecture over framework-heavy design.
- Use sqlc/ent/gorm only when they fit the team and complexity.

## Go Framework Guidance

- Use net/http or chi for simple services.
- Use Gin/Fiber only when team accepts the framework conventions.
- Use gRPC for internal high-contract service communication.
- Use sqlc for SQL-first type-safe data access.
- Use ent when schema-driven graph-style modeling helps.

## Ruby Standards

Use Ruby when:

- Developer productivity and convention matter.
- The product benefits from Rails ecosystem.
- Team values fast iteration.

Rules:

- Keep domain logic outside controllers.
- Avoid callback-heavy hidden behavior.
- Use service objects/interactors only when they clarify use cases.
- Keep models from becoming god objects.
- Use background jobs for slow work.
- Use strong parameters.
- Use authorization policies.
- Avoid monkey patching in application code.
- Use RuboCop and security scanning.

## Rails Standards

Use Rails when:

- Full-stack productivity matters.
- CRUD/admin/product iteration speed matters.
- Convention over configuration is valuable.

Rules:

- Thin controllers.
- Models own persistence rules, not every business process.
- Use concerns sparingly.
- Use ActiveJob for async work.
- Use Hotwire/Turbo where it reduces frontend complexity.
- Use Rails security defaults.
- Use database constraints, not only validations.
- Avoid N+1 with includes/preload/eager_load.
- Use policies for authorization.
- Keep migrations safe and reversible where possible.

## Scala Standards

Use Scala when:

- Strong typing and functional patterns provide real domain value.
- Concurrency, streaming, or data-heavy systems need type safety.
- Team is experienced enough to maintain it.

Rules:

- Prefer Scala 3 for new apps unless ecosystem requires Scala 2.13.
- Use Scala LTS for libraries or conservative enterprise systems.
- Use ADTs for domain modeling.
- Use immutability by default.
- Avoid overly abstract FP code that the team cannot maintain.
- Use effect systems like ZIO or Cats Effect only when benefits justify complexity.
- Keep type-level programming practical.
- Add strong tests for laws/business rules.

## Scala Framework Guidance

- Play Framework for web applications needing mature Scala/Java web stack.
- ZIO HTTP/ZIO ecosystem for functional, typed, concurrent services.
- Akka/Pekko-style systems only when actor/reactive model is justified.
- Spark for big data processing, not general APIs.

## Authentication and Authorization

- Authentication proves identity.
- Authorization decides allowed actions.
- Always enforce authorization server-side.
- Use RBAC for simple role permissions.
- Use ABAC/policy-based auth for complex resource/context rules.
- Prevent IDOR by checking ownership.
- Use secure cookies for browser sessions when possible.
- Avoid localStorage for sensitive tokens.
- Rotate refresh tokens.
- Use MFA for sensitive systems.
- Add audit logs for sensitive actions.

## API Standards

- Consistent error format.
- Correct HTTP methods/status codes.
- Pagination for collections.
- Idempotency keys for retryable writes.
- Request IDs.
- Rate limiting for sensitive routes.
- OpenAPI or equivalent contract.
- Backward-compatible changes by default.
- Version only when breaking changes are unavoidable.
