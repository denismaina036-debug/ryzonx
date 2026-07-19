# RyvonX Implementation Playbook

This directory is the **official engineering implementation roadmap for RyvonX**. It contains the governing Implementation Playbook and phased **Implementation Specifications** (`01_PHASE_*` through `10_PHASE_*`).

Version: 1.0

Status: Active

Document Type: Engineering Playbook

Depends On:

- [01_RYVONX_INVESTMENT_ARCHITECTURE.md](../architecture/01_RYVONX_INVESTMENT_ARCHITECTURE.md)
- [02_MARKETPLACE_ARCHITECTURE.md](../architecture/02_MARKETPLACE_ARCHITECTURE.md)
- [03_POOL_MANAGER_ARCHITECTURE.md](../architecture/03_POOL_MANAGER_ARCHITECTURE.md)
- [04_ADMIN_GOVERNANCE.md](../architecture/04_ADMIN_GOVERNANCE.md)
- [05_DYNAMIC_RATINGS_ENGINE.md](../architecture/05_DYNAMIC_RATINGS_ENGINE.md)
- [06_INVESTMENT_CYCLES.md](../architecture/06_INVESTMENT_CYCLES.md)
- [07_TRADING_JOURNAL.md](../architecture/07_TRADING_JOURNAL.md)
- [08_USER_ROLES_AND_PERMISSIONS.md](../architecture/08_USER_ROLES_AND_PERMISSIONS.md)
- [09_DATABASE_RELATIONSHIPS.md](../architecture/09_DATABASE_RELATIONSHIPS.md)
- [10_PLATFORM_WORKFLOWS.md](../architecture/10_PLATFORM_WORKFLOWS.md)
- [11_BUSINESS_RULES.md](../architecture/11_BUSINESS_RULES.md)

---

# Purpose

This document defines the engineering standards used to implement RyvonX.

The architecture documents describe what the platform is.

This implementation playbook defines how the platform should be built.

Every implementation phase should follow this document before any code is modified.

---

# Implementation Philosophy

RyvonX should evolve through controlled refactoring rather than unnecessary rewrites.

Whenever practical:

- Reuse existing functionality.

- Improve existing architecture.

- Remove duplication.

- Preserve stable functionality.

- Minimize breaking changes.

- Build incrementally.

- Maintain production-quality code.

Every change should improve the platform without introducing unnecessary complexity.

---

# Engineering Principles

Development should prioritize:

- Simplicity

- Readability

- Maintainability

- Extensibility

- Type Safety

- Security

- Performance

- Accessibility

- Testability

- Consistency

Code should be understandable before it is clever.

---

# Development Workflow

Every implementation phase should follow the same workflow.

## Step 1

Read every architecture document relevant to the feature.

Never implement from assumptions.

---

## Step 2

Audit the existing implementation.

Identify:

- Existing components

- Existing services

- Existing database tables

- Existing APIs

- Existing utilities

- Existing hooks

- Existing business logic

Reuse existing work whenever possible.

---

## Step 3

Produce a short implementation plan before modifying code.

The plan should include:

- Scope

- Files expected to change

- Database changes

- API changes

- Risks

- Dependencies

---

## Step 4

Implement only the requested phase.

Do not begin unrelated improvements.

Do not introduce speculative features.

---

## Step 5

Run validation.

Examples include:

- Type checking

- Linting

- Build verification

- Database migration validation

- Routing validation

Resolve issues introduced by the implementation.

---

## Step 6

Produce a completion report containing:

- Summary

- Files changed

- Database migrations

- Breaking changes

- Remaining work

- Testing completed

Stop and wait for review before continuing.

---

# Architecture Dependencies

Architecture documents are the source of business truth.

Implementation must never contradict architecture.

When uncertainty exists:

Architecture wins.

Business Rules take precedence over all implementation decisions.

---

# Cursor Operating Rules

Cursor should always:

- Read relevant architecture documents before coding.

- Reuse existing code whenever appropriate.

- Refactor before rewriting.

- Preserve existing functionality unless intentionally replacing it.

- Avoid hardcoded values.

- Avoid duplicated business logic.

- Keep components modular.

- Maintain strict TypeScript typing.

- Keep functions focused on a single responsibility.

- Respect separation of concerns.

Cursor should never implement features that are not requested in the current phase.

---

# Implementation Standards

Every implementation should:

- Follow project naming conventions.

- Follow project folder structure.

- Follow shared design system.

- Use reusable UI components.

- Use centralized services.

- Use backend-enforced permissions.

- Avoid frontend business logic duplication.

- Preserve auditability.

- Preserve historical records.

Every feature should remain consistent with the rest of the platform.

---

# Required Validation

Before a phase is considered complete, verify:

- No TypeScript errors.

- No linting errors introduced.

- No broken imports.

- No broken routes.

- No unused files created.

- No duplicate services.

- No duplicate components.

- No orphan database objects.

- No broken permissions.

- No violations of Business Rules.

Validation should be completed before requesting review.

---

# Testing Requirements

Every completed phase should include verification of:

- Primary user flows

- Error handling

- Permission enforcement

- State transitions

- API responses

- Database integrity

- UI responsiveness

- Regression risks

Testing should focus on confidence rather than only code coverage.

---

# Completion Checklist

Each implementation phase should conclude with:

- Objectives completed

- Architecture followed

- Existing functionality preserved

- Validation completed

- Testing completed

- Documentation updated (if required)

- Remaining tasks identified

No additional implementation should occur after the checklist without a new phase.

---

# Phase Roadmap

The RyvonX implementation should proceed in the following order:

1. Foundation & Project Audit

2. Authentication & User Management

3. Marketplace

4. Pool Manager Platform

5. Strategy Management

6. Investment Cycle Engine

7. Trading Journal

8. Investor Dashboard

9. Administrative Platform

10. Financial Engine

11. Notifications & Communication

12. Performance & UX Polish

13. Production Readiness

14. Go Live

Each phase should be completed and reviewed before the next begins.

---

# Source of Truth

This Implementation Playbook governs how RyvonX is engineered.

The architecture documents govern what RyvonX is.

If implementation decisions conflict with architecture, the architecture documents take precedence.

Every implementation specification should reference this document before any development begins.

---

# End of RyvonX Implementation Playbook

