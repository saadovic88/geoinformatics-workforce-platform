import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTaskStageNotification, canTransitionTask, getVisitedTaskStages, isTaskArchived, TASK_STAGE_META, taskMatchesPeriod } from '../src/utils/taskWorkflow';
import type { Task, User } from '../src/types';

const task: Task = {
  id: 'task-1', title: 'Update survey database', description: '', projectName: 'Field programme',
  departmentId: 'gis', creatorId: 'manager-1', assigneeIds: ['employee-1'], priority: 'high',
  status: 'not_started', startDate: new Date().toISOString().slice(0, 10), dueDate: '2099-12-31', deadlineTime: '17:00',
  estimatedHours: 8, actualHours: 0, progressPercent: 0, subtasks: [], attachments: [], comments: [], activityLogs: [],
};
const actor = { id: 'employee-1', nameEn: 'Employee One', nameAr: 'الموظف الأول' } as User;

test('task workflow permits only explicit stage transitions', () => {
  assert.equal(canTransitionTask('not_started', 'in_progress'), true);
  assert.equal(canTransitionTask('not_started', 'completed'), false);
  assert.equal(canTransitionTask('submitted', 'needs_revision'), true);
  assert.equal(canTransitionTask('completed', 'in_progress'), true);
  assert.equal(canTransitionTask('completed', 'not_started'), true);
  assert.equal(canTransitionTask('completed', 'blocked'), true);
  assert.equal(canTransitionTask('in_progress', 'not_started'), true);
  assert.equal(canTransitionTask('submitted', 'in_progress'), true);
  assert.equal(canTransitionTask('submitted', 'not_started'), true);
  assert.equal(canTransitionTask('completed', 'submitted'), true);
});

test('stage metadata is complete and genuinely bilingual', () => {
  assert.equal(TASK_STAGE_META.blocked.en, 'Blocked');
  assert.equal(TASK_STAGE_META.blocked.ar, 'متوقفة');
  assert.match(TASK_STAGE_META.needs_revision.ar, /[\u0600-\u06ff]/);
});

test('period filters retain current tasks and isolate archived records', () => {
  assert.equal(taskMatchesPeriod(task, 'all'), true);
  const archived = { ...task, status: 'cancelled' as const, archivedAt: new Date().toISOString() };
  assert.equal(isTaskArchived(archived), true);
  assert.equal(taskMatchesPeriod(archived, 'archive'), true);
  assert.equal(taskMatchesPeriod(archived, 'all'), false);
});

test('timeline never marks optional exception stages as visited without history', () => {
  const completed = { ...task, status: 'completed' as const };
  const visited = getVisitedTaskStages(completed);
  assert.equal(visited.has('in_progress'), true);
  assert.equal(visited.has('submitted'), true);
  assert.equal(visited.has('blocked'), false);
  assert.equal(visited.has('needs_revision'), false);
  const blocked = { ...task, status: 'blocked' as const, stageHistory: [{ id: 'h1', from: 'in_progress' as const, to: 'blocked' as const, actorId: 'employee-1', actorName: 'Employee One', timestamp: new Date().toISOString() }] };
  assert.equal(getVisitedTaskStages(blocked).has('blocked'), true);
});

test('stage notification includes task context, next action and Arabic copy', () => {
  const notification = buildTaskStageNotification({ task, from: 'in_progress', to: 'blocked', actor, recipientId: 'manager-1', note: 'Waiting for source data', id: 'notification-1' });
  assert.match(notification.messageEn, /Update survey database/);
  assert.match(notification.messageEn, /Next:/);
  assert.match(notification.messageAr, /الخطوة التالية/);
  assert.match(notification.messageAr, /الموظف الأول/);
  assert.equal(notification.actionUrl, 'task:task-1');
  assert.equal(notification.priority, 'high');
});

test('task transition migration returns authoritative state and bypasses ordinary assignee guard only inside the RPC', () => {
  const migration = readFileSync('supabase/migrations/0020_task_workflow_transitions.sql', 'utf8');
  assert.match(migration, /'task', task_payload/);
  const workflowBypass = migration.indexOf("current_setting('app.task_transition', true), '') = 'on'");
  const ordinaryAssigneeGuard = migration.indexOf("old.payload->>'creatorId' <> actor::text");
  assert.ok(workflowBypass > -1, 'atomic workflow trigger bypass must exist');
  assert.ok(ordinaryAssigneeGuard > workflowBypass, 'atomic workflow bypass must run before the ordinary assignee restriction');
  assert.match(migration, /item->>'actionUrl' is distinct from 'task:' \|\| task_document_id/);
  assert.match(migration, /jsonb_array_length\(coalesce\(transition_notifications/);
});

test('flexible workflow migration retains returns and requires a reason', () => {
  const migration = readFileSync('supabase/migrations/0028_flexible_task_workflow.sql', 'utf8');
  assert.match(migration, /when 'in_progress' then next_status in \('not_started','blocked','submitted','cancelled'\)/);
  assert.match(migration, /when 'completed' then next_status in \('submitted','needs_revision','cancelled'\)/);
  assert.match(migration, /is_return/);
  assert.match(migration, /recipient::text = task_payload->>'creatorId'/);
});

test('reopen migration preserves an audit trail while allowing completed work to become active', () => {
  const migration = readFileSync('supabase/migrations/0030_reopen_task_stages.sql', 'utf8');
  assert.ok(migration.includes("when 'completed' then next_status in ('not_started', 'in_progress', 'blocked', 'submitted', 'needs_revision', 'cancelled')"));
  assert.match(migration, /\('completed', 'not_started'\)/);
  assert.ok(migration.includes("'{reopenedAt}'"));
  assert.match(migration, /A reason is required when returning/);
});

test('task details use a stable render helper while a user types a workflow reason', () => {
  const view = readFileSync('src/components/tasks/TasksView.tsx', 'utf8');
  assert.match(view, /\{selectedTask && renderTaskDetailsModal\(\)\}/);
  assert.doesNotMatch(view, /<TaskDetailsModal\s*\/>/);
  assert.match(view, /Reason for return \(required when returning\)/);
});
