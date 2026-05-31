# INFRASTRUCTURE_STANDARDS.md

## Infrastructure Mission

Infrastructure must be reproducible, secure, observable, scalable, and simple enough for the team to operate.

## Docker Standards

- Use official/trusted base images.
- Use multi-stage builds.
- Use `.dockerignore`.
- Do not run as root.
- Do not install unnecessary packages.
- Pin major versions intentionally.
- Rebuild images regularly.
- Keep images small.
- Avoid secrets in image layers.
- Use health checks where useful.
- Build and test images in CI.
- Prefer distroless/minimal runtime images when compatible.

## Docker Compose Standards

Use for:

- Local development.
- Integration testing.
- Small self-hosted setups when accepted.

Rules:

- Use named volumes.
- Document env vars.
- Keep ports explicit.
- Avoid production secrets in compose files.
- Add healthcheck-based dependencies where useful.

## Kubernetes Standards

Use Kubernetes only when the application/team needs it.

Rules:

- Define requests and limits.
- Use readiness and liveness probes.
- Run as non-root.
- Drop unnecessary capabilities.
- Use restricted Pod Security Standards where possible.
- Use ConfigMaps for non-sensitive config.
- Use Secrets/external secret managers for sensitive config.
- Use NetworkPolicies where supported.
- Use rolling updates.
- Use namespaces.
- Use HPA only with meaningful metrics.
- Avoid privileged containers.
- Avoid hostPath unless necessary.
- Add PodDisruptionBudgets for critical workloads.
- Use ingress/gateway intentionally.
- Add observability from day one.

## CI/CD Standards

Pipeline should include:

- Install dependencies with lockfile.
- Type check.
- Lint.
- Format check.
- Unit tests.
- Integration tests.
- Build.
- Security scan.
- Container scan.
- SBOM where required.
- Deployment approval for production.
- Rollback strategy.

## Observability

Required:

- Structured logs.
- Request IDs.
- Metrics.
- Tracing for distributed systems.
- Error reporting.
- Health checks.
- Audit logs.
- Dashboards.
- Alerts based on user impact.

## Deployment Strategy

Use:

- Blue/green when rollback speed matters.
- Canary when risk needs gradual exposure.
- Rolling update for normal services.
- Feature flags for risky features.
- Database expand-contract migrations for zero downtime.
