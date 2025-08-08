# CLAUDE.md - Web App

This file provides guidance to Claude Code when working with the **app.build web frontend** in this directory.

## Quick Reference

**Development:**

```bash
bun dev                      # Start development server
bun build                    # Build for production
bun preview                  # Preview production build
```

**Code Quality:**

```bash
bun lint                     # Check code formatting with Prettier
bun lint:fix                 # Auto-fix formatting issues
bun types:check              # TypeScript type checking
```

**Testing:**

```bash
bun e2e:test                 # Run E2E tests with Playwright
bun e2e:ui                   # Run E2E tests with UI
bun e2e:codegen              # Generate E2E test code (logged in)
bun e2e:codegen:logged-out   # Generate E2E test code (logged out)
```

## Architecture

This is the **React frontend** for the app.build platform, built with:

- **React 19** + **TypeScript**
- **Vite** (build tool and dev server)
- **TanStack Router** (file-based routing)
- **TanStack Query** (server state management)
- **Tailwind CSS 4** (styling)
- **Stack Auth** (authentication)
- **Playwright** (E2E testing)

## Key Directories

- `src/components/` - Reusable UI components
- `src/pages/` - Route components and page layouts
- `src/hooks/` - Custom React hooks
- `src/stores/` - Client-side state management
- `src/external/` - External service integrations
- `e2e/` - Playwright end-to-end tests

## Development Guidelines

**Components:**

- Use functional components with TypeScript
- Import UI components from `@appdotbuild/design`
- Follow kebab-case for file naming: `chat-message.tsx`
- Use named exports for components
- Create index.ts files for clean imports

**Styling:**

- Use Tailwind CSS classes
- Import `cn` from `~/lib/utils.ts` for conditional classes
- use `@appdotbuild/design` for base components and `~/components/shared` for components that are not part of the design package
- use `useIsMobile` hook from `@appdotbuild/design` to check if the user is on a mobile device

**State Management:**

- Use TanStack Query for server state
- Use Zustand stores (in `~/stores/`) for client state
- Prefer built-in React hooks when possible

**Authentication:**

- Use `useUser()` hook from `@stackframe/react` in client components
- Check `~/lib/auth.ts` for auth utilities
- Handle auth states in components appropriately

**Routing:**

- File-based routing with TanStack Router
- Route files in `~/pages/` directory
- Use type-safe navigation and params

**API Integration:**

- API client in `~/external/api/services.ts`
- Use TanStack Query hooks for data fetching
- Handle loading/error states properly

## Testing

**E2E Tests:**

- Tests in `~/e2e/tests/` directory
- Use `~/e2e/setup/` for test configuration
- Storage states for authenticated/unauthenticated tests
- Follow existing patterns for new tests

## Common Patterns

**Component Structure:**

```tsx
export default function MyComponent({ prop }: { prop: string }) {
  return (
    <div className={cn('base-classes', conditionalClasses)}>
      {/* component content */}
    </div>
  );
}
```

**Query Hook:**

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['key'],
  queryFn: () => apiCall(),
});
```

**Auth Check:**

```tsx
const user = useUser();
if (!user) return <LoginPrompt />;
```

## Important Notes

- This app uses **Tailwind CSS 4** (newer version)
- Follow the monorepo patterns defined in root CLAUDE.md
- Always check existing components before creating new ones
- Use components from `@appdotbuild/design`, if new components are needed, install them through `bunx shadcn@latest add <component>` int the design package
- E2E tests require specific setup - check existing tests for patterns
- Always use absolute imports, like `~/components/chat/chat-container.tsx` instead of `../../components/chat/chat-container.tsx`
