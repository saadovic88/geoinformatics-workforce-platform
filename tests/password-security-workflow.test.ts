import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('password security stores events, never password material', () => {
  const migration = readFileSync('supabase/migrations/0032_password_security_audit_and_admin_reset.sql', 'utf8');
  assert.match(migration, /create table if not exists public\.password_security_events/);
  assert.match(migration, /after update of encrypted_password on auth\.users/);
  assert.match(migration, /event_type in \('password_changed', 'reset_requested'\)/);
  assert.doesNotMatch(migration, /password\s+text/i);
});

test('only the three named password administrators can read events or request resets', () => {
  const migration = readFileSync('supabase/migrations/0032_password_security_audit_and_admin_reset.sql', 'utf8');
  assert.match(migration, /m\.badawy@geoinformatics\.com/);
  assert.match(migration, /amr\.soghayar@geoinformatics\.com/);
  assert.match(migration, /badr\.salama@geoinformatics\.com/);
  assert.match(migration, /using \(public\.is_password_administrator\(\)\)/);
  assert.match(migration, /record_password_reset_request/);
});

test('employee dossier requests a secure recovery link and shows only audit status', () => {
  const view = readFileSync('src/components/directory/EmployeeProfileModal.tsx', 'utf8');
  assert.match(view, /resetPasswordForEmail\(user\.email/);
  assert.match(view, /record_password_reset_request/);
  assert.match(view, /Last password change/);
  assert.doesNotMatch(view, /temporary password/i);
});
