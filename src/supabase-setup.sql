-- =============================================================================
-- HISTOBOX — Supabase Setup Script
-- Run once in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → paste → Run
-- Safe to re-run (idempotent).
-- =============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- =============================================================================
-- TABLE DEFINITIONS (CREATE IF NOT EXISTS)
-- =============================================================================

-- ── app_state ────────────────────────────────────────────────────────────────
create table if not exists app_state (
  key              text primary key,
  value            jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);

-- ── app_state_backups ─────────────────────────────────────────────────────────
create table if not exists app_state_backups (
  id               uuid primary key default gen_random_uuid(),
  key              text not null,
  value            jsonb not null,
  reason           text not null default 'manual',
  source_updated_at timestamptz,
  backed_up_at     timestamptz not null default now()
);

-- ── roles ────────────────────────────────────────────────────────────────────
create table if not exists roles (
  id               uuid primary key default gen_random_uuid(),
  name             text unique not null,
  description      text,
  is_system        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── permissions ──────────────────────────────────────────────────────────────
create table if not exists permissions (
  id               uuid primary key default gen_random_uuid(),
  resource         text not null,
  action           text not null,
  unique (resource, action)
);

-- ── role_permissions ─────────────────────────────────────────────────────────
create table if not exists role_permissions (
  role_id          uuid references roles(id) on delete cascade,
  permission_id    uuid references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ── app_settings ─────────────────────────────────────────────────────────────
create table if not exists app_settings (
  id               text primary key default 'main',
  id_prefix        text not null default 'HCP',
  support_link     text,
  default_role_id  text not null default 'role-viewer',
  delayed_days     integer not null default 7,
  stain_delay_hours integer not null default 48,
  visible_columns  jsonb not null default '{}',
  variables        jsonb not null default '{}',
  updated_at       timestamptz not null default now()
);

-- ── system_roles ─────────────────────────────────────────────────────────────
create table if not exists system_roles (
  id          text primary key,
  name        text not null,
  is_default  boolean not null default false,
  permissions text[] not null default '{}'
);

-- ── system_users ─────────────────────────────────────────────────────────────
create table if not exists system_users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  email       text,
  gender      text not null default 'Male',
  ra_number   text not null default '',
  phone       text not null default '',
  office      text not null default 'MLS',
  designation text not null default '',
  role_id     text references system_roles(id) on delete set null,
  is_active   boolean not null default true,
  password    text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── cases ────────────────────────────────────────────────────────────────────
create table if not exists cases (
  id                   uuid primary key default gen_random_uuid(),
  lab_number           text not null default '',
  hospital_number      text not null default '',
  patient_name         text not null default '',
  nature_of_sample     text not null default '',
  type_of_sample       text not null default '',
  patient_type         text not null default '',
  resident_doctor      text not null default '',
  mls_on_call          text not null default '',
  status               text not null default 'pending',
  clinical_info        text not null default '',
  gross_description    text not null default '',
  microscopy           text not null default '',
  diagnosis            text not null default '',
  comments             text not null default '',
  bench                jsonb not null default '{}',
  logs                 jsonb not null default '[]',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── reports ──────────────────────────────────────────────────────────────────
create table if not exists reports (
  id                   uuid primary key default gen_random_uuid(),
  serial_number        text not null default '',
  title                text not null default '',
  category             text not null default '',
  type                 text not null default '',
  description          text not null default '',
  location             text not null default '',
  mls_in_charge        text not null default '',
  reported_by          text not null default '',
  superior_reported    boolean not null default false,
  immediate_action     text not null default '',
  root_cause_analysis  text not null default '',
  corrective_actions   text not null default '',
  status               text not null default 'open',
  logs                 jsonb not null default '[]',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── requests ─────────────────────────────────────────────────────────────────
create table if not exists requests (
  id              uuid primary key default gen_random_uuid(),
  case_id         text not null default '',
  request_type    text not null default '',
  selected_blocks jsonb not null default '[]',
  selected_stains jsonb not null default '[]',
  requested_by    text not null default '',
  status          text not null default 'pending',
  name            text not null default '',
  logs            jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── query_cases ──────────────────────────────────────────────────────────────
create table if not exists query_cases (
  id                        uuid primary key default gen_random_uuid(),
  lab_number                text not null default '',
  patient_name              text not null default '',
  resident_doctor           text not null default '',
  resident_doctor_initials  text not null default '',
  mls_initials              text not null default '',
  selected_blocks           jsonb not null default '[]',
  selected_stains           jsonb not null default '[]',
  notes                     text not null default '',
  status                    text not null default 'pending',
  requested_by              text not null default '',
  logs                      jsonb not null default '[]',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ── reagents ─────────────────────────────────────────────────────────────────
create table if not exists reagents (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default '',
  available    boolean not null default true,
  total_stock  numeric not null default 0,
  unit         text not null default '',
  notes        text not null default '',
  status       text not null default 'ok',
  mls_initials text not null default '',
  preparations jsonb not null default '[]',
  usage_logs   jsonb not null default '[]',
  logs         jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── immuno_reagents ──────────────────────────────────────────────────────────
create table if not exists immuno_reagents (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  type       text not null default '',
  available  boolean not null default true,
  quantity   numeric not null default 0,
  color      text not null default '',
  sops       jsonb not null default '[]',
  logs       jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── immuno_runs ──────────────────────────────────────────────────────────────
create table if not exists immuno_runs (
  id              uuid primary key default gen_random_uuid(),
  reagent_id      uuid references immuno_reagents(id) on delete set null,
  reagent_name    text not null default '',
  date            text not null default '',
  done_by         text not null default '',
  number_of_slides integer not null default 0,
  entries         jsonb not null default '[]',
  logs            jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── lab_supplies ─────────────────────────────────────────────────────────────
create table if not exists lab_supplies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null default '',
  unit           text not null default '',
  store_location text not null default '',
  entries        jsonb not null default '[]',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── consumables ──────────────────────────────────────────────────────────────
create table if not exists consumables (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default '',
  available    boolean not null default true,
  unit         text not null default '',
  total_stock  numeric not null default 0,
  preparations jsonb not null default '[]',
  usage_logs   jsonb not null default '[]',
  entries      jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── equipment ────────────────────────────────────────────────────────────────
create table if not exists equipment (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null default '',
  image_url           text not null default '',
  commissioned        boolean not null default true,
  location            text not null default '',
  description         text not null default '',
  template_id         text not null default '',
  immediate_action    text not null default '',
  root_cause_analysis text not null default '',
  corrective_actions  text not null default '',
  maintenance_logs    jsonb not null default '[]',
  logs                jsonb not null default '[]',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── manuals ──────────────────────────────────────────────────────────────────
create table if not exists manuals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  available  boolean not null default true,
  unit       text not null default '',
  sops       jsonb not null default '[]',
  entries    jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── misc_tabs ────────────────────────────────────────────────────────────────
create table if not exists misc_tabs (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null default '',
  fields             jsonb not null default '[]',
  sub_fields         jsonb not null default '[]',
  calculate_sub_item boolean not null default false,
  created_by         text not null default '',
  logs               jsonb not null default '[]',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── misc_labels ──────────────────────────────────────────────────────────────
create table if not exists misc_labels (
  id                 uuid primary key default gen_random_uuid(),
  tab_id             uuid references misc_tabs(id) on delete cascade,
  name               text not null default '',
  fields             jsonb not null default '[]',
  sub_fields         jsonb not null default '[]',
  values             jsonb not null default '{}',
  calculate_sub_item boolean not null default false,
  created_by         text not null default '',
  logs               jsonb not null default '[]',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── misc_items ───────────────────────────────────────────────────────────────
create table if not exists misc_items (
  id           uuid primary key default gen_random_uuid(),
  tab_id       uuid references misc_tabs(id) on delete cascade,
  label_id     uuid references misc_labels(id) on delete cascade,
  name         text not null default '',
  values       jsonb not null default '{}',
  sub_items    jsonb not null default '[]',
  comments     jsonb not null default '[]',
  manual_total numeric,
  created_by   text not null default '',
  logs         jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── rosters ──────────────────────────────────────────────────────────────────
create table if not exists rosters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  designed_by text not null default '',
  approved_by text not null default '',
  rows        jsonb not null default '[]',
  logs        jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── exams ────────────────────────────────────────────────────────────────────
create table if not exists exams (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null default '',
  access_code         text not null default '',
  results_code        text not null default '',
  candidate_type      text not null default '',
  level               text not null default '',
  school              text not null default '',
  duration            integer not null default 60,
  max_candidates      integer not null default 0,
  is_published        boolean not null default false,
  is_completed        boolean not null default false,
  results_released    boolean not null default false,
  intern_set          boolean not null default false,
  questions           jsonb not null default '[]',
  registration_fields jsonb not null default '[]',
  created_at          timestamptz not null default now()
);

-- ── exam_bank ────────────────────────────────────────────────────────────────
create table if not exists exam_bank (
  id             uuid primary key default gen_random_uuid(),
  difficulty     text not null default 'medium',
  type           text not null default 'mcq',
  question       text not null default '',
  options        jsonb not null default '[]',
  correct_answer text not null default '',
  points         integer not null default 1,
  created_at     timestamptz not null default now()
);

-- ── exam_submissions ─────────────────────────────────────────────────────────
create table if not exists exam_submissions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid references exams(id) on delete cascade,
  candidate_info jsonb not null default '{}',
  answers        jsonb not null default '{}',
  score          numeric not null default 0,
  total_points   numeric not null default 0,
  results_code   text not null default '',
  auto_submitted boolean not null default false,
  created_by     text not null default '',
  logs           jsonb not null default '[]',
  started_at     timestamptz not null default now(),
  submitted_at   timestamptz,
  updated_at     timestamptz not null default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- All tables: authenticated users have full CRUD access.
-- The app enforces finer-grained permissions via the role/permissions system.
-- =============================================================================

do $$
declare
  tbl text;
  tbls text[] := array[
    'app_state','app_state_backups','roles','permissions','role_permissions',
    'app_settings','system_roles','system_users',
    'cases','reports','requests','query_cases',
    'reagents','immuno_reagents','immuno_runs',
    'lab_supplies','consumables','equipment','manuals',
    'misc_tabs','misc_labels','misc_items',
    'rosters','exams','exam_bank','exam_submissions'
  ];
begin
  foreach tbl in array tbls loop
    -- Enable RLS
    execute format('alter table %I enable row level security', tbl);

    -- Drop old catch-all policies if they exist (idempotent)
    execute format('drop policy if exists "Allow authenticated read"  on %I', tbl);
    execute format('drop policy if exists "Allow authenticated write" on %I', tbl);
    execute format('drop policy if exists "Allow authenticated insert" on %I', tbl);
    execute format('drop policy if exists "Allow authenticated update" on %I', tbl);
    execute format('drop policy if exists "Allow authenticated delete" on %I', tbl);
    execute format('drop policy if exists "auth_select" on %I', tbl);
    execute format('drop policy if exists "auth_insert" on %I', tbl);
    execute format('drop policy if exists "auth_update" on %I', tbl);
    execute format('drop policy if exists "auth_delete" on %I', tbl);

    -- Create fresh policies
    execute format(
      'create policy "auth_select" on %I for select to authenticated using (true)', tbl);
    execute format(
      'create policy "auth_insert" on %I for insert to authenticated with check (true)', tbl);
    execute format(
      'create policy "auth_update" on %I for update to authenticated using (true)', tbl);
    execute format(
      'create policy "auth_delete" on %I for delete to authenticated using (true)', tbl);
  end loop;
end $$;

-- ── current_user_permissions RPC ─────────────────────────────────────────────
create or replace function current_user_permissions()
returns table (
  resource text,
  action text
) security definer as $$
begin
  return query
  select p.resource, p.action
  from permissions p;
end;
$$ language plpgsql;

-- =============================================================================================
-- UUID DEFAULTS — ensure gen_random_uuid() is set on all uuid primary keys
-- =============================================================================

do $$
declare
  r record;
begin
  for r in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and data_type = 'uuid'
      and column_name = 'id'
      and (column_default is null or column_default not like '%gen_random_uuid%')
  loop
    execute format(
      'alter table %I alter column id set default gen_random_uuid()',
      r.table_name
    );
  end loop;
end $$;

-- =============================================================================
-- SEED: app_settings (lab prefix = HCP, sensible defaults)
-- =============================================================================

-- Safely add updated_at if the table exists without it
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'app_settings'
      and column_name  = 'updated_at'
  ) then
    alter table app_settings add column updated_at timestamptz not null default now();
  end if;
end $$;

insert into app_settings (
  id, id_prefix, default_role_id,
  delayed_days, stain_delay_hours,
  visible_columns, variables
)
values (
  'main', 'HBX', 'role-default',
  7, 48,
  '{"labNumber":true,"hospitalNumber":true,"patientName":true,"natureOfSample":true,"typeOfSample":true,"patientType":true}',
  jsonb_build_object(
    'natureOfSamples',         '["Biopsy","Excision","Curettage","Aspiration","Resection","Amputation"]'::jsonb,
    'typesOfSamples',          '["Histology","Cytology","Post Mortem"]'::jsonb,
    'nationalities',           '["Nigeria","Ghana","South Africa","Kenya","Egypt","Ethiopia","Tanzania","Uganda","Cameroon","Algeria","Morocco","United States","United Kingdom","Canada","India","China","Germany","France","Brazil","Australia"]'::jsonb,
    'qcCriteriaHistology',     '["Right sample","Floaters","Thickness","Folds","Chatter","Shatter","Cytoplasm Stain Quality","Nuclear Crisp appearance","Air bubble","Water bubble","Nuclear bubble"]'::jsonb,
    'qcCriteriaCytology',      '["Right sample","Floaters","Thickness","Folds","Cytoplasm Stain Quality","Nuclear Crisp appearance","Air bubble","Water bubble"]'::jsonb,
    'reportTypes',             '["Fire","Spill","Equipment Failure","Chemical Exposure","Needle Stick","Slip/Fall"]'::jsonb,
    'reportLocations',         '["Main Lab","Cytology Lab","IHC Lab","Hallway"]'::jsonb,
    'requestTypes',            '["IHC","Special Stain","Recut","Deeper Section"]'::jsonb,
    'labSupplyTypes',          '["Embalming Fluid","Formalin","Xylene","Alcohol","Paraffin Wax"]'::jsonb,
    'labSupplyParams',         '["Location","Received By","Date Received","Quantity","Supplier","Batch Number"]'::jsonb,
    'residentDoctors',         '[]'::jsonb,
    'mlsOnCall',               '[]'::jsonb,
    'stainCategories', '[
      {"id":"sc-routine","name":"Routine","stains":["H & E"]},
      {"id":"sc-histo","name":"Histochemistry","stains":["PAS","Congo Red","Masson Trichrome","Reticulin","Giemsa","Ziehl-Neelsen","Alcian Blue","Oil Red O","Iron Stain"]},
      {"id":"sc-ihc","name":"IHC","stains":["PR","ER","HER2","Ki-67","P53","CD3","CD20","CK7","CK20","Vimentin"]}
    ]'::jsonb,
    'hospitalPrefixes', '[
      {"id":"hp-ife","hospitalUnit":"Ife Hospital Unit","prefix":"H"},
      {"id":"hp-wes","hospitalUnit":"Wesley Guide Hospital","prefix":"WH"},
      {"id":"hp-den","hospitalUnit":"Ife Dental Unit","prefix":"DEN"}
    ]'::jsonb,
    'maintenanceTemplates', '[
      {"id":"1","name":"Leica Peloris II","checklist":["Check reagent levels","Inspect tubing","Clean chambers","Run diagnostic cycle","Check temperature probes","Verify agitation","Clean exterior"]},
      {"id":"2","name":"Leica Bond III","checklist":["Check reagent containers","Clean slide trays","Inspect waste containers","Run cleaning cycle","Verify dispensing","Check barcode reader"]},
      {"id":"3","name":"Ventana Benchmark Ultra","checklist":["Check reagent dispensers","Clean slide heater","Inspect waste lines","Run maintenance wash","Verify temperature","Check barcode scanner"]},
      {"id":"4","name":"Leica Tissue-Tek Embedding machine","checklist":["Clean wax reservoir","Check temperature","Clean mold trays","Inspect heating elements","Clean forceps wells","Check cold plate"]},
      {"id":"5","name":"Leica Microtome","checklist":["Clean blade holder","Lubricate mechanisms","Check handwheel brake","Inspect blade clamp","Clean specimen clamp","Check section thickness"]},
      {"id":"6","name":"Leica Emi automatic Microtome","checklist":["Clean blade holder","Check motor function","Lubricate feed mechanism","Inspect safety features","Verify section thickness","Clean waste tray"]},
      {"id":"7","name":"Mavotech Microtome","checklist":["Clean blade holder","Lubricate mechanisms","Check handwheel","Inspect clamp","Clean specimen holder","Verify thickness"]},
      {"id":"8","name":"Marvotech Hot Plate","checklist":["Clean surface","Check temperature accuracy","Inspect power cord","Verify thermostat","Clean exterior"]},
      {"id":"9","name":"Marvotech Waterbath","checklist":["Clean tank","Check temperature","Change water","Inspect heating element","Clean exterior","Check thermostat"]},
      {"id":"10","name":"Marvotech Microscope","checklist":["Clean lenses","Check light source","Inspect stage mechanism","Clean eyepieces","Verify focus mechanism","Check electrical connections"]},
      {"id":"11","name":"Olympus Microscope","checklist":["Clean objective lenses","Clean eyepieces","Check illumination","Inspect stage","Verify focus","Clean condenser","Check electrical"]},
      {"id":"12","name":"Leica Cryostat","checklist":["Defrost chamber","Clean blade holder","Check temperature","Inspect anti-roll plate","Clean specimen holder","Verify section quality"]},
      {"id":"13","name":"Hettich Cytospin centrifuge","checklist":["Clean rotor","Check speed calibration","Inspect lid seal","Clean chamber","Verify timer","Check brake function"]},
      {"id":"14","name":"Haier Thermocool Chest Freezer","checklist":["Check temperature","Defrost if needed","Clean interior","Inspect seal","Check power indicator","Verify alarm function"]},
      {"id":"15","name":"Haier Thermocool Fridge","checklist":["Check temperature","Clean interior","Inspect door seal","Check power indicator","Organize contents","Verify alarm"]}
    ]'::jsonb,
    'protocols', '[
      {"id":"proto-standard-histo","name":"Standard Histology Overnight","sampleTypes":["Histology"],"steps":[
        {"reagent":"10% NBF","duration":"1 hr","concentration":"10%"},
        {"reagent":"70% Alcohol","duration":"1 hr","concentration":"70%"},
        {"reagent":"80% Alcohol","duration":"1 hr","concentration":"80%"},
        {"reagent":"95% Alcohol","duration":"1 hr","concentration":"95%"},
        {"reagent":"Absolute Alcohol I","duration":"1 hr","concentration":"100%"},
        {"reagent":"Absolute Alcohol II","duration":"1 hr","concentration":"100%"},
        {"reagent":"Absolute Alcohol III","duration":"1 hr","concentration":"100%"},
        {"reagent":"Xylene I","duration":"1 hr","concentration":"100%"},
        {"reagent":"Xylene II","duration":"1 hr","concentration":"100%"},
        {"reagent":"Paraffin Wax I","duration":"1 hr","concentration":"100%","temperature":"60°C"},
        {"reagent":"Paraffin Wax II","duration":"1 hr","concentration":"100%","temperature":"60°C"},
        {"reagent":"Paraffin Wax III","duration":"1 hr","concentration":"100%","temperature":"60°C"}
      ]},
      {"id":"proto-rapid","name":"Rapid Processing (2hr)","sampleTypes":["Histology"],"steps":[
        {"reagent":"10% NBF","duration":"15 min","concentration":"10%"},
        {"reagent":"80% Alcohol","duration":"10 min","concentration":"80%"},
        {"reagent":"95% Alcohol","duration":"10 min","concentration":"95%"},
        {"reagent":"Absolute Alcohol I","duration":"10 min","concentration":"100%"},
        {"reagent":"Absolute Alcohol II","duration":"10 min","concentration":"100%"},
        {"reagent":"Xylene I","duration":"15 min","concentration":"100%"},
        {"reagent":"Xylene II","duration":"15 min","concentration":"100%"},
        {"reagent":"Paraffin Wax I","duration":"15 min","concentration":"100%","temperature":"60°C"},
        {"reagent":"Paraffin Wax II","duration":"15 min","concentration":"100%","temperature":"60°C"}
      ]},
      {"id":"proto-pm","name":"Post Mortem Protocol","sampleTypes":["Post Mortem"],"steps":[
        {"reagent":"10% NBF","duration":"2 hr","concentration":"10%"},
        {"reagent":"70% Alcohol","duration":"1.5 hr","concentration":"70%"},
        {"reagent":"80% Alcohol","duration":"1.5 hr","concentration":"80%"},
        {"reagent":"95% Alcohol","duration":"1.5 hr","concentration":"95%"},
        {"reagent":"Absolute Alcohol I","duration":"1.5 hr","concentration":"100%"},
        {"reagent":"Absolute Alcohol II","duration":"1.5 hr","concentration":"100%"},
        {"reagent":"Xylene I","duration":"1.5 hr","concentration":"100%"},
        {"reagent":"Xylene II","duration":"1.5 hr","concentration":"100%"},
        {"reagent":"Paraffin Wax I","duration":"1.5 hr","concentration":"100%","temperature":"60°C"},
        {"reagent":"Paraffin Wax II","duration":"1.5 hr","concentration":"100%","temperature":"60°C"}
      ]},
      {"id":"proto-cyto","name":"Cytology Processing","sampleTypes":["Cytology"],"steps":[
        {"reagent":"95% Alcohol Fix","duration":"15 min","concentration":"95%"},
        {"reagent":"Absolute Alcohol","duration":"5 min","concentration":"100%"},
        {"reagent":"Xylene","duration":"5 min","concentration":"100%"}
      ]},
      {"id":"proto-if-cryostat","name":"IF Procedure (Cryostat)","sampleTypes":["Histology"],"steps":[
        {"reagent":"Fresh Tissue Snap-Freeze (OCT embedded)","duration":"1 min","concentration":"N/A","temperature":"-80°C"},
        {"reagent":"Cryostat Sectioning","duration":"5 min","concentration":"N/A","temperature":"-20°C"},
        {"reagent":"Acetone Fixation","duration":"10 min","concentration":"100%","temperature":"-20°C"},
        {"reagent":"Air Dry","duration":"15 min","concentration":"N/A"},
        {"reagent":"PBS Wash","duration":"5 min","concentration":"1X"},
        {"reagent":"Block (Normal Serum)","duration":"30 min","concentration":"5%"},
        {"reagent":"Primary Antibody Incubation","duration":"60 min","concentration":"per marker"},
        {"reagent":"PBS Wash (x3)","duration":"5 min each","concentration":"1X"},
        {"reagent":"Fluorochrome-conjugated Secondary Ab","duration":"45 min","concentration":"per marker"},
        {"reagent":"PBS Wash (x3)","duration":"5 min each","concentration":"1X"},
        {"reagent":"DAPI Counterstain","duration":"5 min","concentration":"1 µg/mL"},
        {"reagent":"Mount with Aqueous Anti-Fade Medium","duration":"—","concentration":"N/A"}
      ]}
    ]'::jsonb
  )
)
on conflict (id) do update set
  -- Never overwrite a user-customized id_prefix or default_role_id
  id_prefix       = coalesce(nullif(app_settings.id_prefix,''), excluded.id_prefix),
  default_role_id = coalesce(nullif(app_settings.default_role_id,''), excluded.default_role_id),
  -- Merge variables: only fill keys that are missing in the existing row
  variables       = excluded.variables || app_settings.variables;


-- =============================================================================
-- SEED: default system_roles
-- =============================================================================

insert into system_roles (id, name, is_default, permissions) values
  ('role-superuser', 'Superuser', false, array[
    'view_overview','view_cases','add_entry','edit_entry','delete_case',
    'bench_fixation','bench_processing','bench_embedding','bench_microtomy',
    'bench_cyto_analysis','bench_staining','bench_mounting',
    'microscopy_review','signout_approve',
    'view_reports','add_reports','edit_reports','delete_reports',
    'view_requests','add_requests','edit_requests','delete_requests','manage_requests',
    'view_query','add_query','edit_query','delete_query','manage_query',
    'view_maintenance','add_maintenance','edit_maintenance','delete_maintenance',
    'view_reagent','add_reagent','edit_reagent','delete_reagent',
    'view_immuno_reagent','add_immuno_reagent','edit_immuno_reagent','delete_immuno_reagent',
    'view_immuno_manual','add_immuno_manual','edit_immuno_manual','delete_immuno_manual',
    'view_lab_supply','add_lab_supply','edit_lab_supply','delete_lab_supply',
    'view_misc','add_misc_tab','edit_misc_tab','delete_misc_tab',
    'add_misc_label','edit_misc_label','delete_misc_label',
    'add_misc_item','edit_misc_item','delete_misc_item',
    'add_misc_subitem','edit_misc_subitem','delete_misc_subitem',
    'add_misc_comment','edit_misc_comment','delete_misc_comment',
    'view_exam','add_exam','edit_exam','delete_exam',
    'view_roster','add_roster','edit_roster','delete_roster',
    'manage_settings','manage_roles','manage_users','register_users','manage_db_sync'
  ]),
  ('role-default', 'Staff', true, array[
    'view_overview','view_cases','add_entry',
    'bench_fixation','bench_processing','bench_embedding','bench_microtomy',
    'bench_cyto_analysis','bench_staining','bench_mounting',
    'view_reports','view_maintenance',
    'view_reagent','view_immuno_reagent','view_immuno_manual','view_lab_supply',
    'view_roster','view_misc'
  ]),
  ('role-viewer', 'Viewer', true, array[
    'view_overview','view_cases','view_reports','view_maintenance'
  ]),
  ('role-guest', 'Guest', false, array[
    'view_exam','view_roster'
  ])
on conflict (id) do nothing;

-- ── quality_controls ─────────────────────────────────────────────────────────
create table if not exists quality_controls (
  id               uuid primary key default gen_random_uuid(),
  lab_number       text not null default '',
  case_id          text not null default '',
  checked_by       text not null default '',
  checked_at       timestamptz not null default now(),
  sample_type      text not null default '',
  criteria         jsonb not null default '{}',
  overall_result   text not null default 'Pass',
  comment          text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Enable RLS
alter table quality_controls enable row level security;
create policy if not exists "Allow all for authenticated" on quality_controls
  for all using (true) with check (true);

-- Done.
select 'Histobox setup complete.' as status,
       (select count(*) from system_roles)  as roles,
       (select count(*) from system_users)  as users,
       (select id_prefix from app_settings where id = 'main') as lab_prefix;
