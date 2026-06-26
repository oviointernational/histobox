-- ============================================================
-- HISTOBOX — Supabase Full Fix (safe to run multiple times)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Fixes applied:
--   1. pgcrypto extension for gen_random_uuid()
--   2. misc_tabs / misc_labels / misc_items: UUID defaults + CASCADE FKs
--   3. system_users: DEFAULT on name so role assignment never fails
--   4. app_settings: set id_prefix = 'HCP' (lab number prefix)
--   5. RLS policies for all 21 tables (authenticated full CRUD)
--   6. Removes stuck "Intern" misc tab
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- SECTION 1: Extensions
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- SECTION 2: misc_tabs / misc_labels / misc_items
--            UUID auto-generation + CASCADE deletes
-- ─────────────────────────────────────────────────────────────
ALTER TABLE misc_tabs   ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE misc_labels ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE misc_items  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop existing FKs so we can recreate with CASCADE
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name IN ('misc_labels','misc_items')
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  LOOP
    EXECUTE 'ALTER TABLE ' || r.table_name
      || ' DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
  END LOOP;
END $$;

ALTER TABLE misc_labels
  ADD CONSTRAINT misc_labels_tab_id_fkey
    FOREIGN KEY (tab_id) REFERENCES misc_tabs(id) ON DELETE CASCADE;

ALTER TABLE misc_items
  ADD CONSTRAINT misc_items_tab_id_fkey
    FOREIGN KEY (tab_id) REFERENCES misc_tabs(id) ON DELETE CASCADE;

ALTER TABLE misc_items
  ADD CONSTRAINT misc_items_label_id_fkey
    FOREIGN KEY (label_id) REFERENCES misc_labels(id) ON DELETE SET NULL;

-- Remove the stuck "Intern" tab (children removed via CASCADE)
DELETE FROM misc_tabs WHERE LOWER(name) = 'intern';

-- ─────────────────────────────────────────────────────────────
-- SECTION 3: system_users — fix Access Control role assignment
--            The role-assign upsert sends only id+role_id.
--            Without a DEFAULT on name, it fails NOT NULL if the
--            row doesn't exist yet. DEFAULT 'Unknown' fixes that.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE system_users ALTER COLUMN name SET DEFAULT 'Unknown';

-- ─────────────────────────────────────────────────────────────
-- SECTION 4: app_settings — set HCP as the lab number prefix
--            Creates the settings row if it doesn't exist yet.
-- ─────────────────────────────────────────────────────────────
INSERT INTO app_settings (id, id_prefix)
  VALUES ('main', 'HCP')
  ON CONFLICT (id) DO UPDATE SET id_prefix = 'HCP';

-- ─────────────────────────────────────────────────────────────
-- SECTION 5: RLS Policies — authenticated users get full CRUD
--            Drop all existing policies first (idempotent).
-- ─────────────────────────────────────────────────────────────

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='app_settings' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON app_settings'; END LOOP; END $$;
CREATE POLICY "histobox_app_settings_all" ON app_settings FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='system_roles' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON system_roles'; END LOOP; END $$;
CREATE POLICY "histobox_system_roles_all" ON system_roles FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='system_users' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON system_users'; END LOOP; END $$;
CREATE POLICY "histobox_system_users_all" ON system_users FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='cases' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON cases'; END LOOP; END $$;
CREATE POLICY "histobox_cases_all" ON cases FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='reports' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON reports'; END LOOP; END $$;
CREATE POLICY "histobox_reports_all" ON reports FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='equipment' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON equipment'; END LOOP; END $$;
CREATE POLICY "histobox_equipment_all" ON equipment FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='requests' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON requests'; END LOOP; END $$;
CREATE POLICY "histobox_requests_all" ON requests FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='query_cases' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON query_cases'; END LOOP; END $$;
CREATE POLICY "histobox_query_cases_all" ON query_cases FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='reagents' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON reagents'; END LOOP; END $$;
CREATE POLICY "histobox_reagents_all" ON reagents FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='consumables' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON consumables'; END LOOP; END $$;
CREATE POLICY "histobox_consumables_all" ON consumables FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='manuals' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON manuals'; END LOOP; END $$;
CREATE POLICY "histobox_manuals_all" ON manuals FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='immuno_reagents' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON immuno_reagents'; END LOOP; END $$;
CREATE POLICY "histobox_immuno_reagents_all" ON immuno_reagents FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='immuno_runs' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON immuno_runs'; END LOOP; END $$;
CREATE POLICY "histobox_immuno_runs_all" ON immuno_runs FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='lab_supplies' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON lab_supplies'; END LOOP; END $$;
CREATE POLICY "histobox_lab_supplies_all" ON lab_supplies FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='exams' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON exams'; END LOOP; END $$;
CREATE POLICY "histobox_exams_read_all"    ON exams FOR SELECT USING (TRUE);
CREATE POLICY "histobox_exams_write_auth"  ON exams FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "histobox_exams_update_auth" ON exams FOR UPDATE USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
CREATE POLICY "histobox_exams_delete_auth" ON exams FOR DELETE USING (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='exam_submissions' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON exam_submissions'; END LOOP; END $$;
CREATE POLICY "histobox_exam_submissions_all" ON exam_submissions FOR ALL USING (TRUE) WITH CHECK (TRUE);

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='exam_bank' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON exam_bank'; END LOOP; END $$;
CREATE POLICY "histobox_exam_bank_read_all"    ON exam_bank FOR SELECT USING (TRUE);
CREATE POLICY "histobox_exam_bank_write_auth"  ON exam_bank FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "histobox_exam_bank_update_auth" ON exam_bank FOR UPDATE USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
CREATE POLICY "histobox_exam_bank_delete_auth" ON exam_bank FOR DELETE USING (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='rosters' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON rosters'; END LOOP; END $$;
CREATE POLICY "histobox_rosters_all" ON rosters FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='misc_tabs' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON misc_tabs'; END LOOP; END $$;
CREATE POLICY "histobox_misc_tabs_all" ON misc_tabs FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='misc_labels' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON misc_labels'; END LOOP; END $$;
CREATE POLICY "histobox_misc_labels_all" ON misc_labels FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='misc_items' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON misc_items'; END LOOP; END $$;
CREATE POLICY "histobox_misc_items_all" ON misc_items FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

-- ─────────────────────────────────────────────────────────────
-- Done. Safe to run multiple times.
-- ─────────────────────────────────────────────────────────────
