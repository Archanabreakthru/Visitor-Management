-- ═══════════════════════════════════════════════════════════
-- Breakthru.ai VMS — PostgreSQL Schema
-- Run this in pgAdmin Query Tool (F5)
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension (REQUIRED)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) HOSTS TABLE (seed with 4 sample hosts)
CREATE TABLE IF NOT EXISTS hosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  department VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO hosts (name, email, department) VALUES
('Dr. Sarah Johnson', 'sarah.j@breakthru.ai', 'Engineering'),
('Michael Chen', 'mchen@breakthru.ai', 'Product'),
('Amara Okafor', 'amara@breakthru.ai', 'Operations'),
('James Wilson', 'jwilson@breakthru.ai', 'Executive')
ON CONFLICT DO NOTHING;

-- 2) RFID CARDS TABLE (seed with 10 visitor slots)
CREATE TABLE IF NOT EXISTS rfid_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag VARCHAR(20) UNIQUE NOT NULL,
  label VARCHAR(50),
  assigned_to_visit UUID,
  assigned_to_name VARCHAR(100),
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO rfid_cards (tag, label) VALUES
('VISITOR-01', 'Visitor Slot 1'),
('VISITOR-02', 'Visitor Slot 2'),
('VISITOR-03', 'Visitor Slot 3'),
('VISITOR-04', 'Visitor Slot 4'),
('VISITOR-05', 'Visitor Slot 5'),
('VISITOR-06', 'Visitor Slot 6'),
('VISITOR-07', 'Visitor Slot 7'),
('VISITOR-08', 'Visitor Slot 8'),
('VISITOR-09', 'Visitor Slot 9'),
('VISITOR-10', 'Visitor Slot 10')
ON CONFLICT DO NOTHING;

-- 3) APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  visitor_name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  purpose TEXT,
  host_id UUID REFERENCES hosts(id),
  host_name VARCHAR(100),
  scheduled_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
-- 4) VISITS TABLE (main lifecycle table)
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(50) UNIQUE DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  purpose TEXT,
  host_id UUID REFERENCES hosts(id),
  id_type VARCHAR(20),
  id_number VARCHAR(50),
  photo_b64 TEXT,
  had_appointment BOOLEAN DEFAULT FALSE,
  appointment_id UUID REFERENCES appointments(id),
  visitor_type VARCHAR(20) DEFAULT 'Individual',
  team_name VARCHAR(100),
  team_count INTEGER DEFAULT 2,
  agreement_signed BOOLEAN DEFAULT FALSE,
  approval_status VARCHAR(20) DEFAULT 'pending',
  approval_token VARCHAR(80),
  token_expires TIMESTAMP,
  rfid_tag VARCHAR(20) REFERENCES rfid_cards(tag),
  in_time TIMESTAMP,
  out_time TIMESTAMP,
  duration_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'registered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5) TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  id_type VARCHAR(20),
  id_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6) INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_session ON visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_approval_token ON visits(approval_token);
CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_rfid_available ON rfid_cards(available);
CREATE INDEX IF NOT EXISTS idx_team_members_visit ON team_members(visit_id);

