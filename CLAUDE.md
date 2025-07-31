# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

**Development:**

```bash
bun setup                    # Initial project setup (run once)
bun dev                      # Start all services (backend, admin, mocked-agent)
bun cli                      # Run compiled CLI version
bun cli:watch                # CLI with live reload for development
```

**Code Quality:**

```bash
bun lint                     # Run linting on all packages
bun lint:fix                 # Auto-fix linting issues
bun test                     # Run all tests
bun types:check              # TypeScript type checking
```

**Database (from apps/backend):**

```bash
cd apps/backend && bun run db:generate  # Generate migrations
cd apps/backend && bun run db:migrate   # Run migrations
```

## Architecture

**app.build** is an AI agent platform for generating full-stack applications. The monorepo consists of:

- **`apps/backend/`** - Fastify API server with Drizzle ORM + PostgreSQL
- **`apps/cli/`** - React-based CLI interface using Ink
- **`apps/admin/`** - Next.js 15 admin dashboard
- **`packages/`** - Shared libraries (auth, design, core)

**Tech Stack:**

- Runtime: Bun (package manager and runtime)
- Backend: Fastify + Drizzle ORM + PostgreSQL (Neon)
- Frontend: Next.js 15 + Tailwind CSS + Shadcn UI
- Auth: Stack Auth with GitHub OAuth
- Deployment: Koyeb + Docker + AWS (S3/ECR)

## Development Standards

**File Naming:**

- Use `kebab-case` for all files: `file-name.ts`, `file-name.tsx`
- Use lowercase with dashes for directories: `components/auth-wizard`

**TypeScript:**

- Use TypeScript for all code
- Prefer `type` over `interface` (CLI-specific rule)
- Use functional components: `export default function MyComponent({ myProp }: { myProp: string }) { ... }`
- Use named exports for components

**React Components:**

- Use PascalCase for component names
- Prefer existing components/hooks over `useState`, `useEffect`
- Minimize 'use client' - favor Server Components
- Always generate Storybook stories for UI components

**Authentication Patterns:**

- Client components: `import { useUser } from "@stackframe/stack"`
- Server components: `import { stackServerApp } from "@appdotbuild/auth"; const user = await stackServerApp.getUser()`

**Server Actions:**

- Use `authActionClient` from `@appdotbuild/auth`
- Example: `authActionClient.schema(mySchema).metadata({ name: "myAction" }).action(async ({ parsedInput, ctx }) => { ... })`
- Create separate schema files: `schema.actions.ts`

**UI Components:**

- Import from `@appdotbuild/design/components/...` or `@appdotbuild/design/shadcn/...`
- Use `cn` function from `@appdotbuild/design/lib/utils` for Tailwind classes
- Use `EasyForm` component for forms
- Icons from `@appdotbuild/design/base/icons` (Lucide React)

**Database:**

- Put schema in `apps/backend/src/db` using Drizzle ORM
- Generate migrations: `bun drizzle-kit generate`
- Apply migrations: `bun drizzle-kit migrate`

## Development Setup

**Requirements:**

- Node.js (via nvm)
- Bun 1.2.5
- Docker (must be running)
- 1Password CLI integration
- Neon database branch setup

**Development Workflow:**

1. Run `bun setup` for initial configuration
2. Start two terminals:
   - Terminal 1: `bun dev` (servers)
   - Terminal 2: `bun cli:watch` (CLI development)

**Package Management:**

- Use `bun add` to install packages
- Never use npm or yarn - this is a Bun monorepo

**Git and Pre-commit Hooks:**

- Pre-commit hooks run `lint-staged` automatically on commits
- To skip pre-commit hooks, set `SKIP_PRECOMMIT_HOOKS=true` in your `.env` file or use: `SKIP_PRECOMMIT_HOOKS=true git commit -m "message"`
- Use sparingly - only for emergency fixes or work-in-progress commits

## Error Handling

- Prioritize error handling with early returns and guard clauses
- Use Zod for form validation
- Model expected errors as return values in Server Actions
- Use error boundaries for unexpected errors
- Implement proper error logging with user-friendly messages
