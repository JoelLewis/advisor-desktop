# Contributing to Advisor Desktop

Advisor Desktop is a portfolio demonstration; issues and pull requests are welcome.

## Getting started

```bash
git clone https://github.com/JoelLewis/advisor-desktop.git
cd advisor-desktop
pnpm install
pnpm dev
```

## Conventions

- TypeScript strict, no `any` (use `unknown` and narrow); `type` over `interface`; `as const` unions, no enums; ESM; no barrel files; `@/` maps to `src/`.
- Data flows UI → hook (TanStack Query) → service (`src/services`) → MSW handler → engine (`src/mocks`). The UI never imports a value from `src/mocks`.
- Every displayed figure comes from the engine and is formatted by `src/kit/measure.ts`; agents' claims carry no digits.
- US spelling in copy and code. No real person's name for a demo person.

## Before you open a pull request

```bash
pnpm lint
pnpm type-check
pnpm vitest run
pnpm build
VISUAL_PORT=5195 pnpm visual
```

A change that moves a visual baseline regenerates only that spec's baselines (`VISUAL_PORT=5195 pnpm visual:update -- <spec>`), and every changed PNG is looked at before it is committed.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
