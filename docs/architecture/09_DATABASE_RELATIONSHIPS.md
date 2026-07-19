# # RyvonX Domain Model & Database Relationships

Version: 1.0

Status: Active

Document Type: Domain Model Specification

Depends On:

- [01_RYVONX_INVESTMENT_ARCHITECTURE.md](./01_RYVONX_INVESTMENT_ARCHITECTURE.md)

- [03_POOL_MANAGER_ARCHITECTURE.md](./03_POOL_MANAGER_ARCHITECTURE.md)

- [04_ADMIN_GOVERNANCE.md](./04_ADMIN_GOVERNANCE.md)

- [06_INVESTMENT_CYCLES.md](./06_INVESTMENT_CYCLES.md)

- [07_TRADING_JOURNAL.md](./07_TRADING_JOURNAL.md)

- [08_USER_ROLES_AND_PERMISSIONS.md](./08_USER_ROLES_AND_PERMISSIONS.md)

---

# 1. Purpose

This document defines the logical domain model for RyvonX.

It describes how the core business entities relate to one another without prescribing a specific database implementation.

This specification serves as the authoritative reference for database design, backend services, APIs, analytics, reporting, and future migrations.

---

# 2. Design Principles

The RyvonX domain model should follow these principles:

- Clear ownership

- Single source of truth

- Normalized relationships

- Immutable historical records

- Extensible architecture

- Backend-enforced integrity

- Stable identifiers

- Auditability

Business relationships should drive the database design, not the other way around.

---

# 3. Primary Domain Entities

The core entities of RyvonX include:

- User

- Investor Profile

- Pool Manager Profile

- Strategy

- Investment Cycle

- Investment Allocation

- Trading Journal

- Trade

- Review

- Rating

- Governance Record

- Notification

- Transaction

- Distribution

- Audit Log

Additional entities may be introduced without changing these foundational relationships.

---

# 4. User Relationships

Every authenticated account begins as a User.

A User may own:

- One Investor Profile

- One Pool Manager Profile (after approval)

A User may create:

- Deposits

- Withdrawals

- Reviews

- Notifications

- Investment Allocations

User accounts should remain permanent.

Historical ownership should never be reassigned.

---

# 5. Investor Profile

An Investor Profile belongs to exactly one User.

An Investor may:

- Participate in many Investment Cycles

- Follow many Pool Managers

- Receive many Distributions

- Submit many Reviews

- Own many Transactions

Investor Profiles should remain active regardless of Pool Manager status.

---

# 6. Pool Manager Profile

A Pool Manager Profile belongs to exactly one User.

A Pool Manager owns:

- Many Strategies

- Many Investment Cycles (through Strategies)

- Many Trading Journals

- Many Trades

- Many Governance Records

- Many Ratings

- Many Reviews

- Many Followers

The Pool Manager Profile is permanent.

Historical ownership never changes.

---

# 7. Strategy Relationships

Each Strategy belongs to one Pool Manager.

A Strategy may own many Investment Cycles.

A Strategy may generate many historical performance records.

A Strategy cannot exist without a Pool Manager.

Deleting a Strategy should never delete historical Investment Cycles.

---

# 8. Investment Cycle Relationships

Each Investment Cycle belongs to exactly one Strategy.

Each Investment Cycle owns:

- Many Investor Allocations

- One Trading Journal

- Many Trades

- Many Distributions

- Many Notifications

- Governance Records

Investment Cycles should remain immutable after completion.

---

# 9. Investment Allocation Relationships

Each Investment Allocation belongs to:

- One Investor

- One Investment Cycle

Each allocation records:

- Contribution amount

- Timestamp

- Currency

- Status

- Reference

Allocations become immutable when trading begins.

---

# 10. Trading Journal Relationships

Each Investment Cycle owns one Trading Journal.

Each Trading Journal owns many Trades.

Each Trading Journal contributes to:

- Ratings

- Analytics

- Governance

- Historical performance

Trading Journals remain permanently attached to their Investment Cycle.

---

# 11. Trade Relationships

Every Trade belongs to exactly one Trading Journal.

Each Trade may contain:

- Evidence

- Notes

- Attachments

- Administrative annotations

Trades should never exist outside a Trading Journal.

---

# 12. Rating Relationships

Each Pool Manager owns many historical Rating records.

Ratings may reference:

- Governance events

- Performance

- Journal quality

- Reviews

- Historical activity

Ratings should preserve historical evolution rather than overwrite previous values.

---

# 13. Governance Relationships

Each Governance Record belongs to one Pool Manager.

Governance Records may reference:

- Strategies

- Investment Cycles

- Ratings

- Applications

- Administrative actions

Governance history is immutable.

---

# 14. Review Relationships

Each Review belongs to:

- One Investor

- One Pool Manager

Reviews may optionally reference a completed Investment Cycle.

Reviews should never be reassigned.

---

# 15. Transaction Relationships

Each Transaction belongs to one User.

Transaction categories may include:

- Deposit

- Withdrawal

- Investment

- Distribution

- Fee

- Adjustment

Financial history should never be deleted.

---

# 16. Distribution Relationships

Each Distribution belongs to:

- One Investment Cycle

- One Investor Allocation

Distribution records should include references to the originating allocation.

Completed distributions are immutable.

---

# 17. Notification Relationships

Notifications belong to one User.

Notifications may reference:

- Strategy

- Investment Cycle

- Governance Event

- Distribution

- Transaction

- Review

Notifications should remain independent of business entities while maintaining references.

---

# 18. Audit Log Relationships

Audit Logs may reference any domain entity.

Examples include:

User

Pool Manager

Strategy

Investment Cycle

Trade

Governance

Distribution

Rating

Audit records should never be deleted or modified.

---

# 19. Aggregate Boundaries

The following aggregate roots should be treated independently:

- User

- Pool Manager

- Strategy

- Investment Cycle

- Trading Journal

Each aggregate should own its internal consistency.

Cross-aggregate communication should occur through services rather than direct mutation.

---

# 20. Referential Integrity

Relationships should enforce:

- Valid ownership

- Valid lifecycle state

- Valid permissions

- Historical preservation

Deleting parent records should never silently destroy financial history.

Soft deletion or archival should be preferred where appropriate.

---

# 21. Extensibility

The domain model should support future additions including:

- Institutional Investors

- Multi-Manager Strategies

- AI Performance Models

- Regional Compliance

- Broker Integrations

- External Trading Verification

- Advanced Analytics

Future entities should integrate into this model without restructuring the core architecture.

---

# 22. Source of Truth

This document defines the official domain model for RyvonX.

Database schemas, Supabase migrations, backend services, APIs, analytics, reporting systems, and future architectural decisions should conform to these relationships.

Business logic should be derived from this model rather than from individual database tables.

---

# End of Domain Model & Database Relationships