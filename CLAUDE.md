# Meld Project Guidelines

## Build & Test Commands
- Start dev server: `bun dev`
- Build project: `bun build`
- Run tests: `pnpm test`
- Run specific test: `pnpm test -- path/to/test.test.ts`
- Lint code: `pnpm lint`
- Start Docker services: `pnpm docker:up`
- Stop Docker services: `pnpm docker:down`

## Code Style Guidelines
- Use TypeScript with strict type checking
- Follow path aliases: `@/components`, `@/lib`, etc.
- Use functional React components with hooks
- Prefer const over let
- Use async/await for async code
- Use try/catch for error handling
- Follow naming convention: PascalCase for components, camelCase for variables/functions
- Import order: React, libraries, local components, types, styles
- Use Tailwind for styling with proper class organization
- Use Zustand for state management
- Utilize shadcn/ui component patterns when applicable