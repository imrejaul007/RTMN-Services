-- SalesOS + CustomerJourneyOS Database Schema
-- PostgreSQL

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  company VARCHAR(255),
  phone VARCHAR(50),
  industry VARCHAR(100),
  size VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_company ON customers(company);
CREATE INDEX idx_customers_industry ON customers(industry);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  size VARCHAR(20),
  revenue VARCHAR(50),
  employees INTEGER,
  website VARCHAR(255),
  locations TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_name ON accounts(name);
CREATE INDEX idx_accounts_industry ON accounts(industry);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  title VARCHAR(100),
  department VARCHAR(100),
  phone VARCHAR(50),
  linkedin VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  name VARCHAR(255) NOT NULL,
  value DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  stage VARCHAR(50),
  probability INTEGER DEFAULT 0,
  close_date DATE,
  owner VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_opportunities_account ON opportunities(account_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_owner ON opportunities(owner);

-- ============================================================
-- TWIN TABLES
-- ============================================================

-- Customer Twins (JSONB for flexibility)
CREATE TABLE IF NOT EXISTS customer_twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  data JSONB NOT NULL,
  confidence DECIMAL(5,2) DEFAULT 100,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customer_twins_customer ON customer_twins(customer_id);
CREATE INDEX idx_customer_twins_data ON customer_twins USING GIN(data);

-- Account Twins
CREATE TABLE IF NOT EXISTS account_twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  data JSONB NOT NULL,
  confidence DECIMAL(5,2) DEFAULT 100,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_account_twins_account ON account_twins(account_id);
CREATE INDEX idx_account_twins_data ON account_twins USING GIN(data);

-- Opportunity Twins
CREATE TABLE IF NOT EXISTS opportunity_twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id),
  data JSONB NOT NULL,
  confidence DECIMAL(5,2) DEFAULT 100,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_opportunity_twins_opportunity ON opportunity_twins(opportunity_id);
CREATE INDEX idx_opportunity_twins_data ON opportunity_twins USING GIN(data);

-- Journey Twins
CREATE TABLE IF NOT EXISTS journey_twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id VARCHAR(50),
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  confidence DECIMAL(5,2) DEFAULT 100,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_journey_twins_status ON journey_twins(status);
CREATE INDEX idx_journey_twins_data ON journey_twins USING GIN(data);

-- ============================================================
-- ENGAGEMENT TABLES
-- ============================================================

-- Sequences
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  stats JSONB DEFAULT '{"sent":0,"opened":0,"replied":0,"converted":0}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sequence Steps
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES sequences(id),
  step_order INTEGER NOT NULL,
  type VARCHAR(50),
  template_id VARCHAR(50),
  delay_days INTEGER DEFAULT 0,
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sequence_steps_sequence ON sequence_steps(sequence_id);

-- Sent Messages
CREATE TABLE IF NOT EXISTS sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES sequences(id),
  recipient VARCHAR(255),
  channel VARCHAR(50),
  subject VARCHAR(255),
  content TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  replied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sent_messages_sequence ON sent_messages(sequence_id);
CREATE INDEX idx_sent_messages_status ON sent_messages(status);
CREATE INDEX idx_sent_messages_sent_at ON sent_messages(sent_at);

-- ============================================================
-- CONVERSATION TABLES
-- ============================================================

-- Transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id VARCHAR(50),
  opportunity_id UUID REFERENCES opportunities(id),
  title VARCHAR(255),
  participants TEXT[],
  content TEXT,
  duration INTEGER,
  sentiment JSONB,
  competitors JSONB,
  objections JSONB,
  buying_signals JSONB,
  risk_score INTEGER,
  coaching JSONB,
  status VARCHAR(20) DEFAULT 'transcribed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transcripts_opportunity ON transcripts(opportunity_id);
CREATE INDEX idx_transcripts_status ON transcripts(status);

-- ============================================================
-- EXPERIMENT TABLES
-- ============================================================

-- Experiments
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  hypothesis TEXT,
  description TEXT,
  variants JSONB,
  metrics JSONB,
  status VARCHAR(20) DEFAULT 'draft',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_experiments_status ON experiments(status);

-- Experiment Assignments
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id),
  user_id VARCHAR(100),
  variant_id VARCHAR(50),
  converted BOOLEAN DEFAULT FALSE,
  value DECIMAL(15,2),
  assigned_at TIMESTAMP DEFAULT NOW(),
  converted_at TIMESTAMP
);

CREATE INDEX idx_assignments_experiment ON experiment_assignments(experiment_id);
CREATE UNIQUE INDEX idx_assignments_unique ON experiment_assignments(experiment_id, user_id);

-- ============================================================
-- EVENTS TABLES
-- ============================================================

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  payload JSONB,
  triggers_fired TEXT[],
  customer_id UUID REFERENCES customers(id),
  opportunity_id UUID REFERENCES opportunities(id),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_customer ON events(customer_id);

-- Triggers
CREATE TABLE IF NOT EXISTS triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100),
  conditions JSONB,
  actions JSONB,
  status VARCHAR(20) DEFAULT 'active',
  fire_count INTEGER DEFAULT 0,
  last_fired TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_triggers_status ON triggers(status);

-- ============================================================
-- MEMORY TABLES
-- ============================================================

-- Customer Memory
CREATE TABLE IF NOT EXISTS customer_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  partition VARCHAR(50) DEFAULT 'sales',
  interactions JSONB DEFAULT '[]',
  preferences JSONB,
  history JSONB DEFAULT '[]',
  ai_context JSONB,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customer_memory_customer ON customer_memory(customer_id);

-- ============================================================
-- ANALYTICS TABLES
-- ============================================================

-- Daily Metrics (for trends)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  value DECIMAL(15,4),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_daily_metrics_type ON daily_metrics(metric_type);
CREATE UNIQUE INDEX idx_daily_metrics_unique ON daily_metrics(date, metric_type);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
