# Implement Plan

You are tasked with implementing an approved technical plan from `thoughts/shared/plans/`. These plans contain phases with specific changes and success criteria.

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read the original ticket and all files mentioned in the plan
- **Always read CLAUDE.md** in the repository root for codebase guidelines and standards
- **Read files fully** - never use limit/offset parameters, you need complete context
- Think deeply about how the pieces fit together
- Create a todo list to track your progress
- **Note any "Design Review Checkpoint" sections** in the plan for UI-related phases
- Start implementing if you understand what needs to be done

If no plan path provided, ask for one.

## Codebase Guidelines

Before implementing any code changes:
- **Always reference CLAUDE.md** files in the repository for project-specific standards
- Follow the established file naming conventions, architecture patterns, and tech stack guidelines
- Adhere to the coding standards and development workflows outlined in the codebase documentation
- Use the recommended libraries, components, and patterns specified in CLAUDE.md
- Ensure all code changes align with the project's established conventions
- Keep code comments to the minimum

## Implementation Philosophy

Plans are carefully designed, but reality can be messy. Your job is to:
- Follow the plan's intent while adapting to what you find
- Implement each phase fully before moving to the next
- **Run design reviews when checkpoints are reached** - never skip this step for UI changes
- **Adhere to codebase standards** from CLAUDE.md throughout implementation
- Verify your work makes sense in the broader codebase context
- Update checkboxes in the plan as you complete sections

When things don't match the plan exactly, think about why and communicate clearly. The plan is your guide, but your judgment matters too.

If you encounter a mismatch:
- STOP and think deeply about why the plan can't be followed
- Present the issue clearly:
  ```
  Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this matters: [explanation]

  How should I proceed?
  ```

## Verification Approach

After implementing a phase:
- Run the success criteria checks (usually `make check test` covers everything)
- **Check for UI changes and run design review if needed**:
  - If phase involved UI files (.tsx, .css in apps/web or apps/admin), run `/design-review`
  - Address all [Blocker] and [High-Priority] issues before proceeding
  - Document [Medium-Priority] issues for follow-up
  - Only proceed to next phase after design review passes
- Fix any issues before proceeding
- Update your progress in both the plan and your todos
- Check off completed items in the plan file itself using Edit

Don't let verification interrupt your flow - batch it at natural stopping points.

## If You Get Stuck

When something isn't working as expected:
- First, make sure you've read and understood all the relevant code
- Consider if the codebase has evolved since the plan was written
- Present the mismatch clearly and ask for guidance

Use sub-tasks sparingly - mainly for targeted debugging or exploring unfamiliar territory.

## Resuming Work

If the plan has existing check marks:
- Trust that completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

Remember: You're implementing a solution, not just checking boxes. Keep the end goal in mind and maintain forward momentum.