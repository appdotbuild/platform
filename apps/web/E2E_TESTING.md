# E2E Testing Guide

This guide covers end-to-end testing for the web application using Playwright.

## Setup

### Prerequisites

- Node.js and Bun installed

### Environment Variables

**Local Development:**
Just running bun setup should setup the env vars for local development

## Running Tests

### Local Testing

```bash
# Run all E2E tests
bun e2e:test

# Run tests with UI mode (interactive)
bun e2e:ui

# Generate new test code
bun e2e:codegen
```

### CI/CD

Tests automatically run in CI with:

- Headless mode
- 2 retries on failure
- GitHub Actions reporter
- Vercel protection bypass

## Test Structure

### Directory Layout

```
e2e/
├── sessions/          # Authentication storage - never commit any of these files
├── setup/             # Global setup files
├── tests/             # Test files
└── utils/             # Utility functions
```

### Configuration

**`playwright.config.ts`** configures:

- Test directory: `e2e/tests`
- Global setup (different for local vs CI)
- Browser projects: Desktop Chrome, iPhone 14 Pro
- Authentication state management
- Local development server startup

### Authentication

Tests use persistent authentication via storage state:

- **Global Setup**: Automatically logs in once before tests
- **Session Storage**: Saves login state to `e2e/sessions/storageState.json`
- **Session Reuse**: Skips login if valid session exists

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { getUrl } from '../utils/get-url';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(getUrl());
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Authentication States

**Logged In (default):**

```typescript
// Uses storageState from config - user is authenticated
test('logged in test', async ({ page }) => {
  // Test with authenticated user
});
```

**Logged Out:**

```typescript
// Clear session for unauthenticated tests
test.use({ storageState: { cookies: [], origins: [] } });

test('logged out test', async ({ page }) => {
  // Test with unauthenticated user
});
```

### Test Patterns

**Navigation:**

```typescript
await page.goto(getUrl('/specific-path'));
```

**Form Interactions:**

```typescript
const input = page.getByRole('textbox', { name: 'Input label' });
await input.fill('test value');
await input.press('Enter');
```

**Waiting for Elements:**

```typescript
await page.getByText('Expected text').waitFor();
await expect(page.getByText('Expected text')).toBeVisible();
```

**URL Assertions:**

```typescript
await expect(page).toHaveURL('/expected-path');
```

## Test Examples

### Chat Functionality

```typescript
test('should ask for more details when asking what can you build?', async ({
  page,
}) => {
  const chatInput = page.getByRole('textbox', {
    name: 'Describe the app you want to',
  });

  await chatInput.fill('What can you build?');
  await chatInput.press('Enter');

  await expect(page.getByText('Thinking...')).toBeVisible();
  await expect(
    page.getByText('I need more information to continue'),
  ).toBeVisible();
});
```

### Authentication Flow

```typescript
test('should redirect to login page when not authenticated', async ({
  page,
}) => {
  const input = page.getByRole('textbox', {
    name: 'Describe the app you want to',
  });

  await input.fill('a simple todo list');
  await input.press('Enter');

  await expect(page).toHaveURL('/handler/sign-in');
  await expect(
    page.getByRole('button', { name: 'Sign in with GitHub' }),
  ).toBeVisible();
});
```

## Best Practices

### Test Organization

- Group related tests using `test.describe()`
- Use descriptive test names that explain the expected behavior
- Keep tests focused on single features or user flows

### Selectors

- Prefer `getByRole()` for accessibility-focused selectors
- Use `getByText()` for content-based assertions
- Avoid CSS selectors when possible

### Assertions

- Use `waitFor()` for elements that may load asynchronously
- Use `expect().toBeVisible()` for UI element assertions
- Use `expect(page).toHaveURL()` for navigation assertions

### Error Handling

- Tests automatically retry on failure in CI
- Use `page.screenshot()` for debugging failed tests
- Check browser console for JavaScript errors

## Debugging

### Local Debugging

```bash
# Run tests with browser visible
bun e2e:test --headed

# Run specific test file
bun e2e:test tests/chat.spec.ts

# Debug mode with step-by-step execution
bun e2e:test --debug
```

### CI Debugging

- Screenshots are automatically captured on failure
- HTML reports are generated with trace files and uploaded to S3
- Check GitHub Actions logs for detailed output

## Maintenance

### Session Management

- Sessions expire and are automatically refreshed
- Delete `e2e/sessions/storageState.json` to force re-login
- Update credentials in environment variables as needed

### Test Data

- Use dynamic test data when possible
- Clean up test data after tests complete
- Avoid dependencies between tests

### Browser Updates

- Playwright browsers are automatically updated
- Update `@playwright/test` package regularly
- Test on multiple browsers when adding new features
