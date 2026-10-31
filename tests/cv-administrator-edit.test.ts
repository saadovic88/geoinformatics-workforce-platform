import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('only designated CV administrators can edit another employee CV', () => {
  const migration = readFileSync('supabase/migrations/0031_cv_administrator_edit_and_ceo_seed.sql', 'utf8');
  assert.match(migration, /target_employee_id <> actor and not public\.is_cv_administrator\(\)/);
  assert.match(migration, /save_employee_cv_profile\(uuid, jsonb\)/);
  assert.match(migration, /employee_code = 'GEO-001'/);
});

test('CV workspace uses the guarded administrator RPC and provides the CEO baseline', () => {
  const view = readFileSync('src/components/profile/MyCVView.tsx', 'utf8');
  const templates = readFileSync('src/data/cvTemplateProfiles.ts', 'utf8');
  assert.match(view, /const canEditSelected = !viewingOther \|\| admin/);
  assert.match(view, /rpc\('save_employee_cv_profile'/);
  assert.match(templates, /'GEO-001': \{/);
});
