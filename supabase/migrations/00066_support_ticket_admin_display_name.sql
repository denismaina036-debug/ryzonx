-- Allow admins to set a per-ticket sender display name visible to clients.
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS admin_display_name TEXT;

COMMENT ON COLUMN support_tickets.admin_display_name IS
  'Name shown to investors for admin replies on this ticket (e.g. Chase).';
