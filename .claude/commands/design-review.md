---
allowed-tools: Grep, LS, Read, Edit, MultiEdit, Write, NotebookEdit, WebFetch, TodoWrite, WebSearch, BashOutput, KillBash, ListMcpResourcesTool, ReadMcpResourceTool, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, mcp__playwright__browser_close, mcp__playwright__browser_resize, mcp__playwright__browser_console_messages, mcp__playwright__browser_handle_dialog, mcp__playwright__browser_evaluate, mcp__playwright__browser_file_upload, mcp__playwright__browser_install, mcp__playwright__browser_press_key, mcp__playwright__browser_type, mcp__playwright__browser_navigate, mcp__playwright__browser_navigate_back, mcp__playwright__browser_navigate_forward, mcp__playwright__browser_network_requests, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_drag, mcp__playwright__browser_hover, mcp__playwright__browser_select_option, mcp__playwright__browser_tab_list, mcp__playwright__browser_tab_new, mcp__playwright__browser_tab_select, mcp__playwright__browser_tab_close, mcp__playwright__browser_wait_for, Bash, Glob, Task
description: Complete an intelligent design review of UI changes on the current branch with smart filtering, URL detection, and persistent results
---

You are an intelligent design review orchestrator that conducts comprehensive UI reviews with context awareness and smart automation.

# Phase 1: Pre-flight Analysis and Smart Filtering

## Step 1: Analyze Git Changes

**ANALYZE GIT CHANGES:**

```bash
!`git status`
```

**DETECT CHANGED FILES:**

```bash
!`git diff --name-only origin/HEAD...`
```

**GET FULL DIFF:**

```bash
!`git diff --merge-base origin/HEAD`
```

## Step 2: Smart Change Detection

Parse the changed files to determine if this is a UI-relevant review:

**UI File Patterns to Look For:**
- `apps/web/src/**/*.tsx` (Web app components)
- `apps/admin/src/**/*.tsx` (Admin dashboard components) 
- `packages/design/**/*.tsx` (Design system components)
- `**/*.css` (Styling changes)
- `**/tailwind.config.*` (Tailwind configuration)
- `**/globals.css` (Global styles)

**Skip Review If Only These Changed:**
- `apps/backend/**/*` (Backend only)
- `**/*.sql` (Database migrations)
- `**/*.go` (Backend logic)  
- `**/*.md` (Documentation)
- `**/*.json` (Config without UI impact)
- `**/*.test.*` (Tests only)

**SMART FILTERING LOGIC:**
1. Count UI vs non-UI files changed
2. If zero UI files changed, respond: "No UI changes detected. Skipping design review."
3. If UI files found, proceed with analysis
4. Provide summary: "Found UI changes in X components affecting Y areas"

# Phase 2: URL Discovery and Route Mapping

## Step 3: Detect Affected URLs

**For each changed UI file, determine what URLs need reviewing:**

**Route Detection Strategy:**
1. **Direct Route Files**: Check if changed files are in `pages/` or `app/` directories
2. **Component Usage**: For components, find which pages import them
3. **Layout Changes**: Check if layout components affect multiple routes

**URL Mapping Examples:**
- `apps/web/src/pages/dashboard.tsx` → `http://localhost:5173/dashboard`
- `apps/admin/src/pages/users.tsx` → `http://localhost:3001/users`
- `packages/design/components/Button.tsx` → Find all pages that use Button

**Build Review Plan:**
- List all affected URLs
- Prioritize by impact (direct changes vs indirect usage)
- Ask user to confirm or specify additional URLs

# Phase 3: Development Server Verification

## Step 4: Server Health Check

**PRE-FLIGHT CHECKS:**

```bash
# Check if web dev server is running
!`curl -s http://localhost:5173 >/dev/null && echo "Web server: RUNNING" || echo "Web server: NOT RUNNING"`
```

```bash
# Check if admin dev server is running  
!`curl -s http://localhost:3001 >/dev/null && echo "Admin server: RUNNING" || echo "Admin server: NOT RUNNING"`
```

**If servers not running:**
1. Inform user: "Development servers not detected"
2. Provide instructions: "Please start servers with `bun dev` before continuing"
3. Wait for user confirmation or offer to help start them

**TypeScript/Lint Check:**
```bash
!`bun types:check 2>&1 | head -20`
```

If compilation errors found, warn user and ask if they want to continue anyway.

# Phase 4: Execute Comprehensive Review

## Step 5: Launch UI Agent Review

Use the Task tool to spawn the ui-agent with comprehensive review instructions:

**REVIEW MODE INSTRUCTIONS FOR UI-AGENT:**
- **Primary Focus**: Review the specific URLs identified in Phase 2
- **Testing Scope**: 
  - Visual consistency with existing design system
  - Responsive behavior (1440px, 768px, 375px viewports)
  - Accessibility compliance (WCAG 2.1 AA)
  - Keyboard navigation and focus management
  - Interactive states (hover, active, disabled, loading)
  - Form validation and error handling
  - Console error monitoring
  - Performance and loading behavior

**URLs to Review**: [Pass the detected URLs from Phase 2]

**Expected Output**: Structured markdown report with:
- Executive summary
- Categorized findings (Blocker/High-Priority/Medium-Priority/Nitpicks)
- Screenshots for visual issues
- Specific recommendations with file:line references where applicable

# Phase 5: Persistent Review Documentation

## Step 6: Save Review Results

**Generate Review Document:**
1. Create timestamp-based filename: `YYYY-MM-DD-{branch-name}-review.md`
2. Save to `thoughts/shared/reviews/`
3. Include:
   - Review metadata (date, branch, reviewer, files changed)
   - Complete findings from ui-agent
   - Screenshots and evidence
   - Resolution tracking checkboxes
   - Link to related implementation plans

**Review Document Template:**
```markdown
# Design Review: {Branch Name}

**Date**: {timestamp}
**Branch**: {current-branch}  
**Files Changed**: {count} UI files
**URLs Reviewed**: {detected-urls}

## Summary
{ui-agent-summary}

## Files Changed
{list-of-changed-ui-files}

## Review Findings

### Blockers 🚫
- [ ] {finding-with-screenshot}

### High-Priority ⚠️  
- [ ] {finding-with-screenshot}

### Medium-Priority 📝
- [ ] {finding}

### Nitpicks ✨
- [ ] {finding}

## Screenshots
{embedded-screenshots}

## Follow-up Actions
- [ ] Address blockers before merge
- [ ] File issues for medium-priority items
- [ ] Update design system if patterns found

## Related Links
- Implementation Plan: {link-if-available}
- PR: {pr-link-if-available}
```

# Phase 6: Present Results

## Step 7: Actionable Summary

Present the review results to the user with:

1. **Quick Summary**: "Found X blockers, Y high-priority issues in Z components"
2. **Critical Path**: List must-fix items before merge
3. **File Location**: "Full review saved to `thoughts/shared/reviews/{filename}.md`"
4. **Next Steps**: Recommend immediate actions

**Response Format:**
```
## Design Review Complete ✅

**Quick Summary**: Found {blocker-count} blockers, {high-priority-count} high-priority issues

**Must Fix Before Merge**:
- {blocker-1}
- {blocker-2}

**Review Details**: `thoughts/shared/reviews/{filename}.md`

**Next Steps**:
1. Address blockers listed above
2. Consider high-priority issues for this release
3. Run `/design-review` again after fixes to verify
```

# Smart Features

## Conditional Logic
- **Skip non-UI changes**: Exit early if no UI files changed
- **Adaptive URL detection**: Smart mapping based on file types and usage
- **Server-aware**: Only proceed when development environment is ready
- **Error resilient**: Handle compilation errors gracefully

## User Interaction
- Confirm detected URLs before review
- Allow user to specify additional routes
- Ask about review depth (quick vs comprehensive)
- Provide clear next steps based on findings

## Performance Optimized
- Only review changed components and their dependents
- Cache results to avoid re-reviewing unchanged areas
- Batch screenshots and testing for efficiency
- Focus testing on most likely problem areas

This enhanced design review process transforms a simple diff review into an intelligent, context-aware system that knows what to test, ensures the environment is ready, and provides persistent, actionable results.