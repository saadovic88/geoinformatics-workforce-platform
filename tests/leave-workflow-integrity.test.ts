import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/0029_leave_workflow_date_integrity.sql', 'utf8');

test('leave workflow is server-authoritative and retains reversible signatory decisions', () => {
  assert.match(migration, /create or replace function public\.transition_company_leave/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /next_decision not in \('approved', 'rejected'\)/i);
  assert.match(migration, /next_status := 'approved'/i);
  assert.match(migration, /next_status := 'rejected'/i);
  assert.match(migration, /app\.leave_transition/i);
});

test('leave and task documents reject invalid or reversed calendar dates', () => {
  assert.match(migration, /Task due date cannot be before the start date/i);
  assert.match(migration, /Leave end date cannot be before the start date/i);
  assert.match(migration, /Hourly permissions must start and end on the same date/i);
});
