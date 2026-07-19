# # RyvonX Investment Cycle Architecture

Version: 1.0

Status: Active

Document Type: Investment Cycle Specification

Depends On:

- [01_RYVONX_INVESTMENT_ARCHITECTURE.md](./01_RYVONX_INVESTMENT_ARCHITECTURE.md)

- [03_POOL_MANAGER_ARCHITECTURE.md](./03_POOL_MANAGER_ARCHITECTURE.md)

- [13_POOL_CYCLE_OWNERSHIP.md](./13_POOL_CYCLE_OWNERSHIP.md)

---

## Refinement (Pool-Owned Cycles)

Investment Cycles belong to a **Pool** (`investment_cycles.fund_id`), not standalone marketplace products.

- Investors browse pools; the active cycle is shown on the pool detail page.
- Cycle 1 is created when a pool is approved; future cycles inherit the latest pool configuration.
- Completed cycles retain an immutable `pool_config_snapshot` for audit integrity.

See [13_POOL_CYCLE_OWNERSHIP.md](./13_POOL_CYCLE_OWNERSHIP.md) for the full model.

---

# 1. Purpose

This document defines the complete lifecycle of an Investment Cycle within the RyvonX ecosystem.

Investment Cycles are the operational units through which capital is raised, managed, traded, and distributed.

Every Strategy may operate many Investment Cycles throughout its lifetime.

Investment Cycles are temporary.

Strategies are permanent.

Pool Managers are permanent.

---

# 2. Philosophy

Every Investment Cycle should be:

Transparent

Auditable

Professionally Managed

Governed

Time-Bound

Financially Traceable

Historically Preserved

Investor Focused

Each completed cycle permanently contributes to the Pool Manager's professional history.

---

# 3. Investment Cycle Definition

An Investment Cycle represents one complete investment event.

It begins when a Pool Manager creates a new cycle under an approved Strategy.

It ends after:

Trading completes

Profit distribution finishes

Administrative review concludes

Historical records are archived

The Strategy remains active after completion.

A new Investment Cycle may then be created.

---

# 4. Lifecycle

Every Investment Cycle follows the same official lifecycle.

Draft

↓

Submitted

↓

Administrative Review

↓

Approved

↓

Funding

↓

Fully Funded

↓

Trading Active

↓

Trading Completed

↓

Administrative Review

↓

Distribution

↓

Completed

↓

Historical Archive

No state should be skipped.

---

# 5. Draft Stage

The Pool Manager prepares the Investment Cycle.

Examples include:

Cycle Name

Funding Goal

Minimum Investment

Maximum Capacity

Duration

Description

Expected Timeline

Supporting Information

Drafts remain private.

---

# 6. Submission

The Pool Manager submits the Investment Cycle for review.

Submission locks the draft from further editing until reviewed.

Administrators receive a review request.

---

# 7. Administrative Review

Administrators evaluate:

Strategy Status

Manager Governance

Funding Requirements

Timeline

Compliance

Capital Allocation

Professional Standing

Decision outcomes include:

Approve

Reject

Request Changes

Rejected cycles return to Draft.

---

# 8. Funding

Approved Investment Cycles enter Funding.

Funding is the only period during which investors may commit capital.

Funding displays:

Target Capital

Raised Capital

Remaining Capital

Funding Percentage

Investor Count

Funding Deadline

Minimum Investment

Funding Status

Funding should remain dynamic.

---

# 9. Investor Participation

Only eligible investors may participate.

Each investment creates a permanent allocation record.

Allocation includes:

Investor

Amount

Timestamp

Currency

Status

Reference Number

Investment allocations become immutable after Trading begins.

---

# 10. Capital Locking

When Trading begins:

Funding closes.

Investor participation stops.

Contribution amounts become locked.

Capital ownership is finalized.

No additional investments may be accepted.

---

# 11. Trading Phase

Trading begins after Funding closes.

Pool Managers execute investment decisions according to the approved Strategy.

Every trade must be recorded in the Trading Journal.

Trading status should remain visible to investors.

---

# 12. Trading Journal

Every trade should include structured information.

Examples include:

Instrument

Direction

Entry

Exit

Stop Loss

Take Profit

Position Size

Risk

Profit/Loss

Fees

Manager Notes

Trade Status

Supporting Attachments

Trading Journals remain permanently attached to the Investment Cycle.

---

# 13. Trading Completion

Trading concludes when the Pool Manager closes all positions.

The journal is finalized.

Performance is calculated.

The Investment Cycle enters Administrative Review.

---

# 14. Administrative Review After Trading

Administrators review:

Trading Journal

Compliance

Performance

Journal Completeness

Transparency

Professional Conduct

If approved:

Profit Distribution begins.

If issues are identified:

Additional review may be requested.

---

# 15. Profit Distribution

Distribution occurs after approval.

Each participant receives:

Contribution

Profit

Fees

Net Distribution

Distribution Reference

Completion Date

Distribution records become permanent.

---

# 16. Completion

After Distribution:

The Investment Cycle becomes Completed.

No further operational changes are permitted.

Historical records become immutable.

---

# 17. Historical Archive

Completed Investment Cycles remain permanently available.

Historical information includes:

Funding

Trading

Performance

Journal

Distribution

Reviews

Ratings Impact

Governance Notes

Historical cycles should never disappear.

---

# 18. Relationship to Strategy

A Strategy may operate many Investment Cycles.

Examples:

Growth Strategy

↓

Cycle 1

↓

Cycle 2

↓

Cycle 3

↓

Cycle 4

Performance accumulates across all cycles.

---

# 19. Relationship to Pool Manager

Investment Cycles contribute to:

Professional Reputation

Historical Statistics

Ratings

Governance

Achievements

Investor Confidence

Cycles never replace the Pool Manager.

They strengthen the Pool Manager's professional history.

---

# 20. Investor Experience

Investors should always understand:

Current Stage

Funding Status

Trading Status

Performance

Expected Timeline

Distribution Status

Historical Results

Transparency should remain a priority throughout the lifecycle.

---

# 21. Notifications

Lifecycle events should generate notifications.

Examples include:

Funding Opened

Funding Closing Soon

Funding Completed

Trading Started

Trading Completed

Distribution Ready

Cycle Completed

Notifications should originate from backend events.

---

# 22. State Validation

Invalid transitions should be rejected.

Examples:

Trading cannot begin before Funding closes.

Distribution cannot begin before Administrative Review.

Completion cannot occur before Distribution.

Historical Archive cannot occur before Completion.

Lifecycle integrity must always be preserved.

---

# 23. Extensibility

Future enhancements may include:

Rolling Investment Cycles

Institutional Cycles

Multi-Manager Cycles

Regional Compliance Rules

Advanced Distribution Models

The lifecycle should remain extensible.

---

# 24. Source of Truth

This document defines the official lifecycle of every Investment Cycle.

All workflows, dashboards, APIs, Marketplace pages, Pool Manager Profiles, reporting systems, and administrative tools should comply with this specification.

---

# End of Investment Cycle Architecture