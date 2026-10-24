import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');

test('company documents have archival history and no browser deletion policy', () => {
  const retention = read('supabase/migrations/0014_company_data_retention.sql');
  const guard = read('supabase/migrations/0024_permanent_company_record_guard.sql');
  assert.match(retention, /company_data_document_history/);
  assert.match(retention, /before update or delete on public\.company_data_documents/i);
  assert.match(guard, /before delete on public\.company_data_documents/i);
  assert.match(guard, /cannot be deleted/i);
});

test('private task attachment files cannot be deleted through client storage policies', () => {
  const attachmentMigration = read('supabase/migrations/0023_private_task_file_attachments.sql');
  const retentionGuard = read('supabase/migrations/0024_permanent_company_record_guard.sql');
  assert.match(attachmentMigration, /task attachment participants can read/);
  assert.match(retentionGuard, /drop policy if exists "task attachment owners can delete unlinked files"/);
  assert.match(retentionGuard, /intentionally no DELETE policy/i);
});

test('tasks use retained archive status rather than a delete operation', () => {
  const source = read('src/context/DataContext.tsx');
  assert.match(source, /updateTaskStatus\(taskId, 'cancelled', 'Archived by an authorised manager; record retained\.'/);
  assert.doesNotMatch(source, /from\('company_data_documents'\)\.delete\(/);
});
