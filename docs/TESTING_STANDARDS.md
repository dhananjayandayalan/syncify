# TESTING_STANDARDS.md

## Testing Mission

Use test-driven development where it provides high value, especially for business logic, security-sensitive flows, state transitions, and critical user journeys.

## TDD Rules

Use TDD for:

- Domain rules.
- Pricing/payment/calculation logic.
- Permissions.
- Auth flows.
- Form validation.
- State machines.
- Data transformations.
- Legacy refactoring.
- Bug fixes.
- Critical UI flows.

TDD cycle:

1. Write failing test.
2. Implement minimal solution.
3. Refactor safely.
4. Add edge cases.
5. Add integration coverage if needed.

## Frontend Testing

Use:

- Unit tests for utilities.
- Component tests for behavior.
- Accessibility tests.
- E2E tests for critical journeys.
- Visual regression for design systems if needed.
- Mock network at boundary.

Test:

- Keyboard navigation.
- Loading states.
- Error states.
- Empty states.
- Permission-based UI.
- Responsive behavior where critical.
- Re-render-sensitive behavior.

## Backend Testing

Use:

- Unit tests for domain/use-case logic.
- Integration tests for database/API boundaries.
- Contract tests for service interfaces.
- Security tests for auth/authorization.
- Testcontainers where useful.
- Load tests for critical endpoints.

Test:

- Validation.
- Authorization.
- Error responses.
- Transactions.
- Idempotency.
- Rate limits.
- Audit logging.
- Data migrations where risky.

## Infrastructure Testing

Use:

- Docker build tests.
- Container vulnerability scans.
- Kubernetes manifest validation.
- Policy checks.
- Smoke tests after deploy.
- Rollback tests for critical services.

## Test Quality

Good tests:

- Are deterministic.
- Are readable.
- Test behavior, not implementation details.
- Fail for useful reasons.
- Cover edge cases.
- Avoid excessive mocking.

Bad tests:

- Snapshot everything.
- Mock the unit under test.
- Depend on test order.
- Assert private implementation.
- Only test happy path.
