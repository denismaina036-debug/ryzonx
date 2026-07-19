# RyvonX User Roles & Permissions

Version: 1.0

Status: Active

Document Type: Authorization & Permissions Specification

Depends On:

- [01_RYVONX_INVESTMENT_ARCHITECTURE.md](./01_RYVONX_INVESTMENT_ARCHITECTURE.md)
- [03_POOL_MANAGER_ARCHITECTURE.md](./03_POOL_MANAGER_ARCHITECTURE.md)
- [04_ADMIN_GOVERNANCE.md](./04_ADMIN_GOVERNANCE.md)

---

# 1. Purpose

This document defines the official authorization model for the RyvonX platform.

Authorization determines what users are allowed to see, create, modify, approve, and manage.

Authentication identifies who a user is.

Authorization determines what that user may do.

Permissions must always be enforced by backend services.

The frontend should never be trusted as the source of authorization.

---

# 2. Authorization Principles

RyvonX follows these principles:

• Least privilege

• Explicit permissions

• Role-based access

• Context-aware authorization

• Backend enforcement

• Immutable audit history

• Administrative accountability

Every permission should exist for a clear business reason.

---

# 3. User Roles

RyvonX currently supports the following roles.

Visitor

Investor

Pool Manager Applicant

Pool Manager

Support Administrator

Compliance Administrator

Finance Administrator

Governance Administrator

Super Administrator

Future roles should extend this model rather than replace it.

---

# 4. Visitor Permissions

Visitors may:

- View public pages
- Browse public Marketplace listings
- View public Pool Manager Profiles
- View marketing pages
- Register
- Log in

Visitors may not:

- Invest
- Deposit
- Withdraw
- Follow managers
- Access dashboards
- Access trading journals that require authentication
- Access administrative functions

---

# 5. Investor Permissions

Investors may:

- Manage their account
- Complete identity verification
- Deposit funds
- Withdraw funds
- Browse Marketplace
- Search managers
- Filter managers
- Follow managers
- View strategies
- View investment cycles
- Invest
- Track investments
- View portfolio
- Receive distributions
- Submit reviews
- Apply to become a Pool Manager

Investors may not:

- Create strategies
- Create investment cycles
- Manage investor funds
- Approve applications
- Modify ratings
- Modify governance
- Access administrative tools

---

# 6. Pool Manager Applicant Permissions

Applicants inherit all Investor permissions.

Additionally they may:

- Submit application
- Complete evaluation
- Maintain evaluation journal
- Upload supporting documentation
- View application progress
- Respond to administrator requests

Applicants may not:

- Create strategies
- Create investment cycles
- Accept investor funds
- Advertise investment opportunities

---

# 7. Pool Manager Permissions

Pool Managers inherit Investor permissions.

Additionally they may:

- Maintain professional profile
- Create strategies
- Edit draft strategies
- Submit strategies for approval
- Create investment cycles
- Manage draft investment cycles
- Submit cycles for approval
- Manage active funding
- Record trades
- Maintain trading journals
- View analytics
- Communicate with investors
- View governance notifications
- Respond to investor reviews where supported

Pool Managers may not:

- Approve strategies
- Approve investment cycles
- Modify ratings
- Modify governance history
- Edit historical records
- Modify completed distributions
- Access administrator functions

---

# 8. Support Administrator Permissions

Support Administrators may:

- View user accounts
- Respond to support requests
- View communication history
- Manage support tickets
- Assist users with operational issues

Support Administrators may not:

- Approve Pool Managers
- Modify ratings
- Allocate institutional capital
- Suspend managers without appropriate authority

---

# 9. Compliance Administrator Permissions

Compliance Administrators may:

- Review identity verification
- Review documentation
- Monitor compliance
- Review governance records
- Recommend actions
- Monitor platform integrity

Compliance Administrators should not directly manage investments.

---

# 10. Finance Administrator Permissions

Finance Administrators may:

- Monitor deposits
- Monitor withdrawals
- Review distributions
- Review institutional allocations
- Monitor transaction integrity
- Generate financial reports

Finance Administrators may not modify governance or ratings unless specifically authorized.

---

# 11. Governance Administrator Permissions

Governance Administrators may:

- Review Pool Manager applications
- Approve or reject applications
- Approve strategies
- Approve investment cycles
- Issue warnings
- Suspend managers
- Restore managers
- Modify governance status
- Apply governance notes
- Assign verification
- Remove verification
- Initiate reviews

Governance Administrators must generate audit records for every governance action.

---

# 12. Super Administrator

Super Administrators possess complete administrative authority.

Responsibilities include:

Platform configuration

Role management

Administrative permissions

Governance oversight

System monitoring

Audit access

Emergency intervention

Super Administrators should use elevated permissions only when required.

---

# 13. Permission Inheritance

Roles inherit permissions from lower roles where appropriate.

Example:

Visitor

↓

Investor

↓

Applicant

↓

Pool Manager

Administrative roles remain independent unless explicitly configured otherwise.

---

# 14. Resource Ownership

Permissions depend upon ownership.

Examples:

Investors manage only their own portfolios.

Pool Managers manage only their own strategies.

Pool Managers manage only their own investment cycles.

Administrators govern platform resources rather than owning them.

Ownership should always be verified before permitting modification.

---

# 15. Backend Enforcement

Authorization must always be enforced by backend services.

Every sensitive operation should verify:

Identity

Role

Ownership

Current status

Permission

The frontend should never be trusted to authorize operations.

---

# 16. Audit Requirements

Every privileged action should generate an audit record.

Examples include:

Approval

Rejection

Suspension

Verification

Role changes

Permission changes

Rating adjustments

Capital allocations

Audit records should remain immutable.

---

# 17. Future Expansion

The permission system should support future additions including:

Regional administrators

Institutional administrators

Auditors

Compliance officers

Operations managers

Read-only analysts

API integrations

The authorization model should remain extensible.

---

# 18. Source of Truth

This document defines the official authorization model for RyvonX.

All backend services, APIs, dashboards, administrative tools, and user interfaces should comply with this specification.

Permission logic should never be duplicated across the platform.

---

# End of User Roles & Permissions

