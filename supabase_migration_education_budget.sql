-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS education_budget (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  amount      numeric(12, 2) NOT NULL,
  type        text NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  reason      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE education_budget ENABLE ROW LEVEL SECURITY;

-- Allow anon read & write (same pattern as your other tables)
CREATE POLICY "anon_all" ON education_budget
  FOR ALL TO anon USING (true) WITH CHECK (true);
