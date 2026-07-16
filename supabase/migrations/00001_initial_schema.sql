-- =============================================================================
-- Ryvonx Database Schema
-- PostgreSQL / Supabase
-- =============================================================================
-- Run via Supabase CLI: supabase db push
-- Or apply manually in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Custom Types (Enums)
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('visitor', 'investor', 'administrator');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'adjustment');
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE trade_direction AS ENUM ('long', 'short');
CREATE TYPE trade_status AS ENUM ('open', 'closed', 'cancelled');
CREATE TYPE journal_sentiment AS ENUM ('bullish', 'bearish', 'neutral');
CREATE TYPE notification_type AS ENUM (
  'deposit_approved', 'deposit_rejected',
  'withdrawal_approved', 'withdrawal_rejected',
  'announcement', 'performance_update', 'system'
);

-- -----------------------------------------------------------------------------
-- Profiles (extends Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'investor',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Investor'),
    'investor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -----------------------------------------------------------------------------
-- Pool Stats (singleton — one row, updated by admin)
-- -----------------------------------------------------------------------------
CREATE TABLE pool_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_pool_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_active_investors INTEGER NOT NULL DEFAULT 0,
  daily_roi NUMERIC(8, 4) NOT NULL DEFAULT 0,
  weekly_roi NUMERIC(8, 4) NOT NULL DEFAULT 0,
  monthly_roi NUMERIC(8, 4) NOT NULL DEFAULT 0,
  total_closed_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  total_deposits NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC(18, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial pool stats row
INSERT INTO pool_stats (id) VALUES (uuid_generate_v4());

-- -----------------------------------------------------------------------------
-- Performance Snapshots (historical fund performance)
-- -----------------------------------------------------------------------------
CREATE TABLE performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  pool_value NUMERIC(18, 2) NOT NULL,
  daily_roi NUMERIC(8, 4) NOT NULL DEFAULT 0,
  cumulative_roi NUMERIC(8, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_performance_snapshots_date ON performance_snapshots(date DESC);

-- -----------------------------------------------------------------------------
-- Trades
-- -----------------------------------------------------------------------------
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  direction trade_direction NOT NULL,
  entry_price NUMERIC(18, 8) NOT NULL,
  exit_price NUMERIC(18, 8),
  quantity NUMERIC(18, 8) NOT NULL,
  pnl NUMERIC(18, 2),
  pnl_percentage NUMERIC(8, 4),
  status trade_status NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_closed_at ON trades(closed_at DESC);

-- -----------------------------------------------------------------------------
-- Journal Entries
-- -----------------------------------------------------------------------------
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sentiment journal_sentiment NOT NULL DEFAULT 'neutral',
  is_public BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entries_public ON journal_entries(is_public, published_at DESC);

-- -----------------------------------------------------------------------------
-- Investor Portfolios
-- -----------------------------------------------------------------------------
CREATE TABLE investor_portfolios (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_invested NUMERIC(18, 2) NOT NULL DEFAULT 0,
  current_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ownership_percentage NUMERIC(8, 6) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_deposits NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC(18, 2) NOT NULL DEFAULT 0,
  last_deposit_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Transactions (deposits, withdrawals, adjustments)
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  status transaction_status NOT NULL DEFAULT 'pending',
  reference TEXT,
  notes TEXT,
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- -----------------------------------------------------------------------------
-- Announcements
-- -----------------------------------------------------------------------------
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- FAQ
-- -----------------------------------------------------------------------------
CREATE TABLE faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Audit Log (future-ready)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- Platform Settings (key-value config store)
-- -----------------------------------------------------------------------------
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Updated_at trigger function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trades_updated_at BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER investor_portfolios_updated_at BEFORE UPDATE ON investor_portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: users read own, admins read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (get_user_role() = 'administrator');
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Pool stats: public read
CREATE POLICY "Anyone can view pool stats"
  ON pool_stats FOR SELECT USING (true);
CREATE POLICY "Admins can update pool stats"
  ON pool_stats FOR UPDATE USING (get_user_role() = 'administrator');

-- Performance: public read
CREATE POLICY "Anyone can view performance"
  ON performance_snapshots FOR SELECT USING (true);
CREATE POLICY "Admins can manage performance"
  ON performance_snapshots FOR ALL USING (get_user_role() = 'administrator');

-- Trades: public read for closed/published
CREATE POLICY "Anyone can view closed trades"
  ON trades FOR SELECT USING (status = 'closed' AND published_at IS NOT NULL);
CREATE POLICY "Admins can manage trades"
  ON trades FOR ALL USING (get_user_role() = 'administrator');

-- Journal: public read
CREATE POLICY "Anyone can view public journal"
  ON journal_entries FOR SELECT USING (is_public = true);
CREATE POLICY "Admins can manage journal"
  ON journal_entries FOR ALL USING (get_user_role() = 'administrator');

-- Portfolios: own data only
CREATE POLICY "Investors can view own portfolio"
  ON investor_portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all portfolios"
  ON investor_portfolios FOR SELECT USING (get_user_role() = 'administrator');
CREATE POLICY "Admins can manage portfolios"
  ON investor_portfolios FOR ALL USING (get_user_role() = 'administrator');

-- Transactions: own data + admin
CREATE POLICY "Investors can view own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Investors can create deposit/withdrawal requests"
  ON transactions FOR INSERT WITH CHECK (
    auth.uid() = user_id AND type IN ('deposit', 'withdrawal')
  );
CREATE POLICY "Admins can manage all transactions"
  ON transactions FOR ALL USING (get_user_role() = 'administrator');

-- Notifications: own only
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT WITH CHECK (get_user_role() = 'administrator');

-- Announcements: public read for published
CREATE POLICY "Anyone can view published announcements"
  ON announcements FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL USING (get_user_role() = 'administrator');

-- FAQ: public read
CREATE POLICY "Anyone can view published FAQ"
  ON faq_items FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage FAQ"
  ON faq_items FOR ALL USING (get_user_role() = 'administrator');

-- Audit logs: admin only
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT USING (get_user_role() = 'administrator');
CREATE POLICY "Admins can create audit logs"
  ON audit_logs FOR INSERT WITH CHECK (get_user_role() = 'administrator');

-- Settings: admin only
CREATE POLICY "Admins can manage settings"
  ON platform_settings FOR ALL USING (get_user_role() = 'administrator');
