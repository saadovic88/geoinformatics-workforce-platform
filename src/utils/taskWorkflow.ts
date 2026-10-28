import { NotificationItem, Task, TaskPriority, TaskStatus, User } from '../types';
import { COMPANY_TIME_ZONE, companyDate } from './companyDate';

export type TaskPeriod = 'week' | 'month' | 'year' | 'all' | 'archive';

export const ACTIVE_TASK_STAGES: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'submitted', 'needs_revision', 'completed'];

export const TASK_STAGE_META: Record<TaskStatus, { en: string; ar: string; tone: string }> = {
  not_started: { en: 'Awaiting start', ar: 'بانتظار البدء', tone: 'slate' },
  in_progress: { en: 'In progress', ar: 'قيد التنفيذ', tone: 'blue' },
  blocked: { en: 'Blocked', ar: 'متوقفة', tone: 'rose' },
  submitted: { en: 'Under review', ar: 'قيد المراجعة', tone: 'amber' },
  needs_revision: { en: 'Revision required', ar: 'تحتاج تعديلًا', tone: 'orange' },
  completed: { en: 'Completed', ar: 'مكتملة', tone: 'emerald' },
  cancelled: { en: 'Archived', ar: 'مؤرشفة', tone: 'slate' },
  overdue: { en: 'Overdue (legacy)', ar: 'متأخرة (سجل سابق)', tone: 'rose' },
};

const TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
  not_started: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['not_started', 'blocked', 'submitted', 'cancelled'],
  blocked: ['not_started', 'in_progress', 'cancelled'],
  submitted: ['in_progress', 'needs_revision', 'completed', 'cancelled'],
  needs_revision: ['not_started', 'in_progress', 'blocked', 'submitted', 'cancelled'],
  overdue: ['not_started', 'in_progress', 'blocked', 'submitted', 'cancelled'],
  completed: ['submitted', 'needs_revision', 'cancelled'],
};

export const getAllowedTaskTransitions = (status: TaskStatus) => TRANSITIONS[status] || [];
export const canTransitionTask = (from: TaskStatus, to: TaskStatus) => getAllowedTaskTransitions(from).includes(to);
export const isTaskArchived = (task: Task) => task.status === 'cancelled' || Boolean(task.archivedAt);
export const isTaskOverdue = (task: Task, now = new Date()) =>
  !['completed', 'cancelled'].includes(task.status) && task.dueDate < companyDate(now);

export const getVisitedTaskStages = (task: Task) => {
  const visited = new Set<TaskStatus>([task.status]);
  (task.stageHistory || []).forEach((entry) => { visited.add(entry.from); visited.add(entry.to); });
  if (!task.stageHistory?.length && ['submitted', 'completed'].includes(task.status)) {
    visited.add('not_started'); visited.add('in_progress'); visited.add('submitted');
  }
  return visited;
};

const toCompanyCalendarDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : companyDate(date);
};

export const taskMatchesPeriod = (task: Task, period: TaskPeriod, now = new Date()) => {
  if (period === 'archive') return isTaskArchived(task);
  if (isTaskArchived(task)) return false;
  if (period === 'all') return true;
  const date = toCompanyCalendarDate(task.lastStatusChangedAt || task.completedAt || task.startDate || task.dueDate);
  if (!date) return period === 'year';
  const current = companyDate(now);
  if (period === 'year') return date.slice(0, 4) === current.slice(0, 4);
  if (period === 'month') return date.slice(0, 7) === current.slice(0, 7);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: COMPANY_TIME_ZONE, weekday: 'short' }).format(now);
  const sundayOffset: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const [year, month, day] = current.split('-').map(Number);
  const weekStart = new Date(Date.UTC(year, month - 1, day - sundayOffset[weekday]));
  const start = weekStart.toISOString().slice(0, 10);
  const end = new Date(weekStart.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  return date >= start && date < end;
};

const PRIORITY_AR: Record<TaskPriority, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة' };
const nextAction = (to: TaskStatus) => {
  switch (to) {
    case 'not_started': return { en: 'Open the task and start work.', ar: 'افتح المهمة وابدأ العمل.' };
    case 'in_progress': return { en: 'Continue the work and submit it when ready.', ar: 'استكمل التنفيذ ثم أرسل المهمة للمراجعة.' };
    case 'blocked': return { en: 'Review the blocking reason and help remove it.', ar: 'راجع سبب التوقف وساعد في إزالة العائق.' };
    case 'submitted': return { en: 'Review the deliverables and record your decision.', ar: 'راجع المخرجات وسجّل قرارك.' };
    case 'needs_revision': return { en: 'Apply the requested changes and resubmit.', ar: 'نفّذ التعديلات المطلوبة ثم أعد الإرسال.' };
    case 'completed': return { en: 'No action is required; the record remains available.', ar: 'لا يلزم إجراء؛ سيظل السجل متاحًا.' };
    default: return { en: 'This record is retained in the company archive.', ar: 'سيظل هذا السجل محفوظًا في أرشيف الشركة.' };
  }
};

export const buildTaskStageNotification = (args: {
  task: Pick<Task, 'id' | 'title' | 'projectName' | 'priority' | 'dueDate'>;
  from: TaskStatus;
  to: TaskStatus;
  actor: Pick<User, 'id' | 'nameEn' | 'nameAr'>;
  recipientId: string;
  note?: string;
  id?: string;
}): NotificationItem => {
  const { task, from, to, actor, recipientId, note } = args;
  const stage = TASK_STAGE_META[to];
  const action = nextAction(to);
  const noteEn = note?.trim() ? ` Note: ${note.trim()}.` : '';
  const noteAr = note?.trim() ? ` الملاحظة: ${note.trim()}.` : '';
  return {
    id: args.id || `notif_task_${task.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: recipientId,
    createdBy: actor.id,
    createdAt: new Date().toISOString(),
    isRead: false,
    type: 'task',
    priority: ['blocked', 'needs_revision'].includes(to) || task.priority === 'critical' ? 'high' : 'medium',
    titleEn: `Task update · ${stage.en}`,
    titleAr: `تحديث مهمة · ${stage.ar}`,
    messageEn: `“${task.title}” in ${task.projectName || 'General work'} moved from ${TASK_STAGE_META[from].en} to ${stage.en} by ${actor.nameEn}. Priority: ${task.priority}. Due: ${task.dueDate}.${noteEn} Next: ${action.en}`,
    messageAr: `تم نقل مهمة «${task.title}» ضمن ${task.projectName || 'الأعمال العامة'} من ${TASK_STAGE_META[from].ar} إلى ${stage.ar} بواسطة ${actor.nameAr || actor.nameEn}. الأولوية: ${PRIORITY_AR[task.priority]}. الاستحقاق: ${task.dueDate}.${noteAr} الخطوة التالية: ${action.ar}`,
    actionUrl: `task:${task.id}`,
  };
};
