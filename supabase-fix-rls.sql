-- ============================================================
-- HISTOBOX — Supabase Full Fix (safe to run multiple times)
-- Run this in your Supabase SQL Editor → New Query → Run
-- Fixes: RLS policies, Misc Tab CRUD, CASCADE deletes,
--        UUID auto-generation, and stuck "Intern" tab removal
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- SECTION 1: UUID extension (required for gen_random_uuid)
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- SECTION 2: Fix misc_tabs / misc_labels / misc_items schema
--            so CREATE, EDIT, and DELETE all work correctly
-- ─────────────────────────────────────────────────────────────

-- 2a. Ensure id columns auto-generate UUIDs (required for upsert without id)
ALTER TABLE misc_tabs
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE misc_labels
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE misc_items
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2b. Remove any existing foreign key constraints on misc_labels and misc_items
--     so we can recreate them with ON DELETE CASCADE
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name IN ('misc_labels','misc_items')
      AND constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
  LOOP
    EXECUTE 'ALTER TABLE ' ||
      (SELECT table_name FROM information_schema.table_constraints
       WHERE constraint_name = r.constraint_name AND table_schema = 'public' LIMIT 1)
      || ' DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
  END LOOP;
END $$;

-- 2c. Recreate foreign keys WITH CASCADE so deleting a tab auto-deletes its labels & items
ALTER TABLE misc_labels
  DROP CONSTRAINT IF EXISTS misc_labels_tab_id_fkey,
  ADD CONSTRAINT misc_labels_tab_id_fkey
    FOREIGN KEY (tab_id) REFERENCES misc_tabs(id) ON DELETE CASCADE;

ALTER TABLE misc_items
  DROP CONSTRAINT IF EXISTS misc_items_tab_id_fkey,
  ADD CONSTRAINT misc_items_tab_id_fkey
    FOREIGN KEY (tab_id) REFERENCES misc_tabs(id) ON DELETE CASCADE;

ALTER TABLE misc_items
  DROP CONSTRAINT IF EXISTS misc_items_label_id_fkey,
  ADD CONSTRAINT misc_items_label_id_fkey
    FOREIGN KEY (label_id) REFERENCES misc_labels(id) ON DELETE SET NULL;

-- 2d. Remove the stuck "Intern" tab (and all its labels/items via CASCADE)
--     This is safe to run even if "Intern" no longer exists
DELETE FROM misc_tabs WHERE LOWER(name) = 'intern';

-- ─────────────────────────────────────────────────────────────
-- SECTION 3: RLS Policies — drop all and recreate correctly
--            Authenticated users get full CRUD on all tables
-- ─────────────────────────────────────────────────────────────

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'app_settings' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON app_settings'; END LOOP;
END $$;
CREATE POLICY "histobox_app_settings_all" ON app_settings
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'system_roles' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON system_roles'; END LOOP;
END $$;
CREATE POLICY "histobox_system_roles_all" ON system_roles
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'system_users' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON system_users'; END LOOP;
END $$;
CREATE POLICY "histobox_system_users_all" ON system_users
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'cases' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON cases'; END LOOP;
END $$;
CREATE POLICY "histobox_cases_all" ON cases
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'reports' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON reports'; END LOOP;
END $$;
CREATE POLICY "histobox_reports_all" ON reports
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'equipment' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON equipment'; END LOOP;
END $$;
CREATE POLICY "histobox_equipment_all" ON equipment
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'requests' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON requests'; END LOOP;
END $$;
CREATE POLICY "histobox_requests_all" ON requests
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'query_cases' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON query_cases'; END LOOP;
END $$;
CREATE POLICY "histobox_query_cases_all" ON query_cases
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'reagents' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON reagents'; END LOOP;
END $$;
CREATE POLICY "histobox_reagents_all" ON reagents
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'consumables' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON consumables'; END LOOP;
END $$;
CREATE POLICY "histobox_consumables_all" ON consumables
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'manuals' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON manuals'; END LOOP;
END $$;
CREATE POLICY "histobox_manuals_all" ON manuals
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'immuno_reagents' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON immuno_reagents'; END LOOP;
END $$;
CREATE POLICY "histobox_immuno_reagents_all" ON immuno_reagents
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'immuno_runs' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON immuno_runs'; END LOOP;
END $$;
CREATE POLICY "histobox_immuno_runs_all" ON immuno_runs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'lab_supplies' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON lab_supplies'; END LOOP;
END $$;
CREATE POLICY "histobox_lab_supplies_all" ON lab_supplies
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'exams' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON exams'; END LOOP;
END $$;
CREATE POLICY "histobox_exams_read_all" ON exams FOR SELECT USING (TRUE);
CREATE POLICY "histobox_exams_write_auth" ON exams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "histobox_exams_update_auth" ON exams
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "histobox_exams_delete_auth" ON exams
  FOR DELETE USING (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'exam_submissions' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON exam_submissions'; END LOOP;
END $$;
CREATE POLICY "histobox_exam_submissions_all" ON exam_submissions
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'exam_bank' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON exam_bank'; END LOOP;
END $$;
CREATE POLICY "histobox_exam_bank_read_all" ON exam_bank FOR SELECT USING (TRUE);
CREATE POLICY "histobox_exam_bank_write_auth" ON exam_bank
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "histobox_exam_bank_update_auth" ON exam_bank
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "histobox_exam_bank_delete_auth" ON exam_bank
  FOR DELETE USING (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'rosters' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON rosters'; END LOOP;
END $$;
CREATE POLICY "histobox_rosters_all" ON rosters
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'misc_tabs' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON misc_tabs'; END LOOP;
END $$;
CREATE POLICY "histobox_misc_tabs_all" ON misc_tabs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'misc_labels' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON misc_labels'; END LOOP;
END $$;
CREATE POLICY "histobox_misc_labels_all" ON misc_labels
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'misc_items' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON misc_items'; END LOOP;
END $$;
CREATE POLICY "histobox_misc_items_all" ON misc_items
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- Done. Safe to run multiple times.
-- After running this:
--  • Misc Tab CREATE, EDIT, DELETE all work
--  • Deleting a tab removes its labels and items automatically
--  • The stuck "Intern" tab is gone
--  • All authenticated users can fully manage all tables
-- ─────────────────────────────────────────────────────────────
