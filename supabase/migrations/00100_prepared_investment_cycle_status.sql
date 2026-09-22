-- A created cycle can exist before it is eligible to accept copier capital.
-- This operational state is trader-controlled and does not imply admin review.
ALTER TYPE investment_cycle_status ADD VALUE IF NOT EXISTS 'prepared' AFTER 'approved';
