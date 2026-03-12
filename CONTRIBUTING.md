# Contributing to Advisor Desktop

Thanks for your interest in contributing! This document covers the guidelines for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork and install dependencies:
   ```bash
   git clone https://github.com/<your-username>/advisor-desktop.git
   cd advisor-desktop
   npm install
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style

- **TypeScript strict mode** — no `any`. Use `unknown` and narrow.
- **ESM imports only** — no CommonJS.
- `type` over `interface`, `as const` over enums.
- No barrel files (`index.ts` re-exports) — use direct imports.
- Path alias: `@/` maps to `src/`.

### Project Conventions

- **Feature-based folders**: new features go in `src/features/<name>/`.
- **Data flow**: Component → Hook (TanStack Query) → Service (fetch) → MSW Handler → Mock Data.
- **AI content**: use the purple accent (`#7C3AED`) for anything AI-generated.
- **Accessibility**: include ARIA labels, respect `prefers-reduced-motion`, ensure keyboard navigation.
- **Loading states**: every data-fetching component needs a skeleton fallback.

### Adding a New Feature

1. Define types in `src/types/`.
2. Create mock data in `src/mocks/data/`.
3. Add MSW handlers in `src/mocks/handlers/` and register them in `index.ts`.
4. Write service functions in `src/services/`.
5. Create hooks in `src/hooks/`.
6. Build UI in `src/features/<name>/`.
7. Add route in `src/routes.tsx` (use `React.lazy()` for code splitting).

### Mock Data Rules

- Position values must sum to account value.
- Account values must sum to household AUM.
- TWR must compound correctly across periods.
- Benchmark comparisons should be plausible (within ~5%).

## Submitting Changes

### Before You Submit

```bash
# Ensure the build passes
npm run build

# Check types
npm run type-check

# Run linting
npm run lint

# Run tests
npm test
```

### Pull Request Process

1. Ensure all checks above pass locally.
2. Write a clear PR title and description summarizing what changed and why.
3. Keep PRs focused — one feature or fix per PR.
4. If adding a new page, include a screenshot in the PR description.

### Commit Messages

Use conventional-style commit messages:

```
feat: add risk analytics Monte Carlo simulation
fix: correct drift calculation in portfolio overview
refactor: extract trade field components
docs: update feature list in README
```

## Reporting Issues

When filing an issue, include:

- Steps to reproduce the problem
- Expected vs. actual behavior
- Browser and OS information
- Screenshots if it's a visual issue

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
