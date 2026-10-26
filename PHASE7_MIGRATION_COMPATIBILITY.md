# RyvonX Phase 7 — Migration compatibility

## Migration 00104

Compatible with the current database after 00103. It references existing profiles, settlements, transactions, ledger accounts, ledger transaction/entry types, audit logs, `update_updated_at()` and `post_ledger_transaction_atomic()`. The linked Supabase dry run accepted it in sequence.

Safety properties verified in isolated PostgreSQL-compatible tests:

- creates no financial correction data;
- requires unapproved draft creation, approves only through the controlled approval function, and rejects empty batches;
- uses exact owner, currency, balance and precondition-hash checks under account locks;
- posts balanced journals only through the existing atomic ledger function;
- retries a completed batch without a second posting;
- rolls the transaction back on a stale balance or ownership mismatch;
- preserves approved evidence and prohibits deletion;
- allows recovery only through an exact reversing compensation entry;
- prevents `service_role` from directly updating entry execution fields.

## Migration 00105

Compatible with the existing `transactions` table and application change. It does not modify or delete existing history. It requires `metadata.allocationId` for new `cycle_profit` events, serializes inserts for that allocation with an advisory transaction lock, and returns `NULL` for an already-existing projection.

The actual protected production duplicate subset was loaded into isolated PGlite: 295 rows remained 295 after a duplicate attempt, and 16 concurrent attempts for a new allocation produced one row. The application uses `.maybeSingle()` so a skipped insert is treated as successful idempotency rather than an error.

## Required order

Deploy the compatible application first, confirm it is live, then apply 00104 and 00105 in numeric order. Applying 00105 while the old application is still live can make the old `.single()` caller treat a safely skipped duplicate as an error.
