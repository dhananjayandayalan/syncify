# SECURITY_STANDARDS.md

## Security Mission

Security is not optional. Every generated solution must be secure by design, secure by default, and auditable.

## Core Rules

- Validate all external input.
- Sanitize output where relevant.
- Use parameterized queries.
- Never concatenate untrusted input into SQL, shell commands, file paths, URLs, templates, or redirects.
- Enforce authorization server-side.
- Use least privilege.
- Never store secrets in source code.
- Never log secrets, tokens, passwords, PII, payment data, or auth headers.
- Use HTTPS in production.
- Use secure cookies for session authentication.
- Protect cookie-based apps against CSRF.
- Rate-limit sensitive endpoints.
- Add audit logs for sensitive business actions.
- Fail securely.

## Authentication

Prefer:

- Secure HTTP-only SameSite cookies for browser session auth.
- Short-lived access tokens.
- Rotating refresh tokens.
- MFA for sensitive accounts.
- Device/session management.
- Secure password hashing with Argon2id/bcrypt/scrypt.
- OAuth/OIDC through trusted providers when appropriate.

Avoid:

- localStorage for sensitive tokens.
- Long-lived JWTs.
- Custom crypto.
- Rolling your own auth protocol.
- Password reset links without expiry and single-use validation.

## Authorization

Use:

- RBAC for simple role systems.
- ABAC for contextual permissions.
- Policy-based authorization for complex products.
- Resource ownership checks.
- Centralized authorization functions.
- Tests for permissions.

Never rely only on:

- Frontend route guards.
- Hidden UI buttons.
- Client-supplied role flags.

## API Security

- Validate body, query, params, headers, files.
- Use request size limits.
- Use CORS allowlists.
- Add rate limiting.
- Add idempotency for retryable writes.
- Use consistent errors without leaking internals.
- Add correlation IDs.
- Add security headers.
- Protect uploads with type/size scanning.
- Validate redirect URLs.

## Frontend Security

- Escape untrusted content.
- Avoid dangerouslySetInnerHTML unless sanitized and justified.
- Use CSP where possible.
- Avoid exposing secrets through client env.
- Avoid sensitive data in browser storage.
- Avoid leaking auth state in URLs.
- Avoid third-party scripts unless necessary.

## Infrastructure Security

- Run containers as non-root.
- Drop unnecessary Linux capabilities.
- Use read-only root filesystem where possible.
- Use Kubernetes restricted Pod Security Standards where possible.
- Use secrets managers.
- Rotate secrets.
- Scan dependencies and images.
- Pin or control base images.
- Separate environments.
- Use network policies where supported.

## Supply Chain Security

- Prefer trusted packages.
- Avoid abandoned dependencies.
- Lock dependency versions.
- Review transitive dependencies for critical systems.
- Use npm/pnpm/yarn audit, osv-scanner, Trivy, Grype, Snyk, or equivalent.
- Generate SBOM for enterprise release pipelines.
- Sign artifacts when possible.

## Security Review Checklist

- Are all inputs validated?
- Is auth required where needed?
- Is authorization server-side?
- Is IDOR prevented?
- Are secrets protected?
- Are logs safe?
- Are dependencies safe?
- Are error messages safe?
- Are files/uploads safe?
- Are database queries parameterized?
- Are sessions/tokens secure?
- Are audit logs added for sensitive actions?
