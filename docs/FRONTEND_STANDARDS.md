# FRONTEND_STANDARDS.md

## Frontend Mission

Build frontend applications that are accessible, fast, maintainable, testable, secure, and framework-appropriate.

Use a frontend framework only when the requirement justifies it. If the application is mostly static, small, or interaction-light, prefer vanilla JavaScript, HTML, and CSS.

## Framework Selection

Use Vanilla JavaScript when:

- The app is small.
- Interactivity is minimal.
- SEO/static content is primary.
- State is simple.
- Framework cost is not justified.

Use React when:

- UI is component-heavy.
- State transitions are complex.
- Product needs strong ecosystem support.
- Server/client composition matters through Next.js.
- Team is comfortable with React.

Use Angular when:

- Enterprise app needs strong conventions.
- Large teams need standardized structure.
- Forms, routing, dependency injection, and tooling should be integrated.
- Long-term maintainability benefits from opinionated architecture.

Use Vue when:

- The team wants progressive adoption.
- The app needs strong developer experience with less boilerplate.
- Composition API fits the domain.
- The product benefits from simple templates and reactivity.

## React Standards

Use modern stable React patterns:

- Function components only.
- React 19+ actions and transitions where appropriate.
- `useTransition` for async UI state transitions.
- `useOptimistic` for optimistic UI where user feedback matters.
- Server Components in Next.js where client interactivity is not needed.
- Client Components only for browser APIs, local state, interactivity, and client-only libraries.
- Form actions/server actions only when security, validation, and UX are handled correctly.
- Avoid unnecessary `useEffect`.
- Avoid derived state when value can be calculated during render.
- Avoid global state for local UI concerns.
- Keep component state close to usage.
- Memoize only when measurable or structurally beneficial.
- Split components by responsibility, not by arbitrary size alone.
- Use stable keys.
- Avoid inline object/function churn in hot paths when it causes child re-renders.
- Use React Profiler for performance claims.

## Angular Standards

Use modern stable Angular patterns:

- Standalone components by default.
- Signals for reactive state where appropriate.
- New control flow syntax where supported.
- Deferrable views for performance-sensitive lazy sections.
- Strict templates.
- Typed forms.
- OnPush or signal-driven rendering for efficient updates.
- Route-level lazy loading.
- Dependency injection for boundaries, not hidden global state.
- Avoid massive services.
- Keep smart/container and presentational responsibilities clear.
- Prefer Angular built-in solutions before extra packages.

## Vue Standards

Use modern stable Vue patterns:

- Vue 3 Composition API.
- `<script setup>` for concise components.
- TypeScript for serious apps.
- Composables for reusable stateful logic.
- Pinia for global state when needed.
- Computed values for derived state.
- Watchers only for side effects.
- Keep templates readable and semantic.
- Avoid large global stores.
- Use Suspense/async components when appropriate.
- Use route-level code splitting.

## Vanilla JavaScript Standards

Use vanilla JavaScript when the framework does not add enough value.

Rules:

- Use semantic HTML first.
- Use progressive enhancement.
- Keep modules small.
- Use event delegation for dynamic lists.
- Use custom elements only when they reduce complexity.
- Use browser APIs before dependencies.
- Avoid DOM mutation chaos; isolate rendering functions.
- Avoid global namespace pollution.
- Use ESM modules.
- Use TypeScript or JSDoc for non-trivial projects.

## CSS Standards

Use modern stable CSS:

- CSS custom properties for design tokens.
- Cascade layers for architecture.
- Container queries for component responsiveness.
- `:has()` when it simplifies stateful styling.
- Logical properties for international-ready layout.
- Modern color functions where supported.
- `clamp()` for fluid typography and spacing.
- `content-visibility` where it safely improves rendering.
- `scroll-margin`, `scroll-padding`, and modern scroll behavior.
- `@media (prefers-reduced-motion)` for motion.
- `@media (prefers-color-scheme)` where theme follows system.
- Avoid CSS bloat.
- Avoid utility sprawl unless project intentionally uses utility-first CSS.
- Prefer small expressive class names and design tokens.
- Use fewer styles that do more.

## Less CSS, More Effectiveness

Prefer:

- Semantic layout over wrapper divs.
- Grid for two-dimensional layout.
- Flexbox for one-dimensional layout.
- Component-level tokens.
- Reusable primitives.
- Intrinsic responsiveness.
- Fluid sizes with `clamp()`.
- Container queries instead of global breakpoint overload.
- Native browser behavior over JS-driven styling.

Avoid:

- Hardcoded pixel-perfect layouts.
- Excessive breakpoints.
- Deep selectors.
- `!important`.
- Duplicated color/spacing values.
- Animation without accessibility fallback.

## Re-render Optimization

React:

- Keep state local.
- Split high-frequency state away from expensive trees.
- Use selectors for global state.
- Avoid unnecessary context value changes.
- Use `memo` only for meaningful expensive children.
- Avoid using array index as key for mutable lists.
- Avoid large controlled forms without optimization.

Angular:

- Prefer signals and OnPush patterns.
- Use track expressions in lists.
- Lazy-load feature routes.
- Avoid expensive template expressions.

Vue:

- Use computed values.
- Keep reactive objects scoped.
- Avoid deep watchers.
- Use `v-memo` only when justified.
- Split components around update frequency.

## Frontend TDD

Use TDD for:

- Core UI state machines.
- Form validation.
- Accessibility behavior.
- Routing guards.
- Permission-based rendering.
- Critical user flows.
- Data transformation.
- Error states.

Test levels:

- Unit tests for pure functions.
- Component tests for behavior.
- Accessibility tests for keyboard and ARIA.
- Integration tests for data flows.
- E2E tests for critical journeys.

## Accessibility

Minimum WCAG AA.

Rules:

- Semantic HTML first.
- Keyboard support for all interactions.
- Visible focus states.
- Proper labels and descriptions.
- Accessible error messages.
- Correct heading order.
- Sufficient contrast.
- Reduced motion support.
- No div-button anti-pattern.
- ARIA only when native semantics are insufficient.
