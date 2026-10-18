import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Task, TaskPriority, TaskStatus } from '../../types';
import {
  CheckSquare,
  Plus,
  Kanban,
  List,
  Search,
  Filter,
  Calendar,
  Clock,
  Paperclip,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  UserCheck,
  Send,
  Sparkles,
  BarChart2,
  Trash2,
} from 'lucide-react';
import { TaskPerformanceInsights } from './TaskPerformanceInsights';

interface TasksViewProps {
  initialViewMode?: 'kanban' | 'list' | 'insights';
  filterScope?: 'my' | 'team';
  initialTaskId?: string;
}

export const TasksView: React.FC<TasksViewProps> = ({
  initialViewMode = 'kanban',
  filterScope = 'my',
  initialTaskId,
}) => {
  const { currentUser, users, isFullAccessUser } = useAuth();
  const {
    tasks,
    createTask,
    deleteTask,
    updateTaskStatus,
    toggleSubtask,
    addTaskComment,
    reviewTask,
  } = useData();
  const { t, isRtl } = useLanguage();

  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'insights'>(initialViewMode);
  const [scope, setScope] = useState<'my' | 'team'>(filterScope);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!initialTaskId) return;
    const task = tasks.find((candidate) => candidate.id === initialTaskId);
    if (task && task.assigneeIds.includes(currentUser.id)) setSelectedTask(task);
  }, [initialTaskId, tasks, currentUser.id]);

  // New task modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('2026-10-15');
  const [newEstimatedHours, setNewEstimatedHours] = useState(40);
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([currentUser.id]);
  const [taskSubmissionError, setTaskSubmissionError] = useState('');

  // Comment input
  const [commentText, setCommentText] = useState('');

  // Manager review input
  const [reviewScore, setReviewScore] = useState<number>(95);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  const directReports = users.filter((user) => user.managerId === currentUser.id && user.status === 'active');
  const assignableUsers = isFullAccessUser ? users.filter((user) => user.status === 'active') : directReports;
  const canAssignTasks = isFullAccessUser || directReports.length > 0;
  const isManager = canAssignTasks;
  const canConfirmCompletion = isFullAccessUser;
  const canViewTeamTask = (task: Task) =>
    isFullAccessUser ||
    task.creatorId === currentUser.id ||
    task.assigneeIds.some((assigneeId) => directReports.some((member) => member.id === assigneeId));

  const filteredTasks = tasks.filter((task) => {
    const isMyTask = task.assigneeIds.includes(currentUser.id);
    // "My tasks" always means the signed-in employee's own assignments.
    if (scope === 'my' && !isMyTask) return false;
    // Team scope is only useful to a manager and is restricted to their area.
    if (scope === 'team' && (!isManager || !canViewTeamTask(task))) return false;

    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const columns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'not_started', label: isRtl ? 'لم تبدأ' : 'Not Started', color: 'border-slate-300' },
    { status: 'in_progress', label: isRtl ? 'قيد التنفيذ' : 'In Progress', color: 'border-blue-500' },
    { status: 'submitted', label: isRtl ? 'مرسلة للاعتماد' : 'Submitted for Review', color: 'border-purple-500' },
    { status: 'completed', label: isRtl ? 'مكتملة' : 'Completed', color: 'border-emerald-500' },
    { status: 'overdue', label: isRtl ? 'متأخرة' : 'Overdue', color: 'border-rose-500' },
  ];

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAssigneeIds[0]) {
      setTaskSubmissionError(isRtl ? 'أدخل عنوان المهمة واختر الموظف المكلّف.' : 'Enter a task title and choose an assignee.');
      return;
    }

    setTaskSubmissionError('');
    const result = await createTask({
      title: newTitle,
      description: newDescription,
      projectName: newProject,
      departmentId: currentUser.departmentId,
      creatorId: currentUser.id,
      assigneeIds: newAssigneeIds,
      priority: newPriority,
      status: 'in_progress',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: newDueDate,
      deadlineTime: '17:00',
      estimatedHours: Number(newEstimatedHours),
      actualHours: 0,
      progressPercent: 10,
      subtasks: [
        { id: `sub_${Date.now()}_1`, title: 'Initial spatial data discovery & setup', isCompleted: false },
        { id: `sub_${Date.now()}_2`, title: 'Geospatial processing & analysis execution', isCompleted: false },
        { id: `sub_${Date.now()}_3`, title: 'Quality check & deliverable packaging', isCompleted: false },
      ],
      attachments: [],
    });

    if (!result.ok) {
      setTaskSubmissionError(isRtl ? `تعذر إرسال المهمة: ${result.message || 'حاول مرة أخرى.'}` : `Could not send the task: ${result.message || 'Please try again.'}`);
      return;
    }

    setShowNewModal(false);
    setNewTitle('');
    setNewProject('');
    setNewDescription('');
  };

  const handleAddComment = () => {
    if (!selectedTask || !commentText.trim()) return;
    addTaskComment(selectedTask.id, commentText);
    setCommentText('');
    // refresh selectedTask state
    const refreshed = tasks.find((t) => t.id === selectedTask.id);
    if (refreshed) setSelectedTask(refreshed);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('tasksTitle')}</h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              {filteredTasks.length} {isRtl ? 'مهام' : 'Tasks'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'متابعة مشاريع الاستشعار ونظم المعلومات الجغرافية، قوائم التدقيق، وملفات GIS.'
              : 'GIS & Remote Sensing deliverables, subtasks checklist, spatial attachments, and manager reviews.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Scope Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setScope('my')}
              className={`px-3 py-1.5 rounded-lg transition ${
                scope === 'my' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('navMyTasks')}
            </button>
            {isManager && <button
              onClick={() => setScope('team')}
              className={`px-3 py-1.5 rounded-lg transition ${
                scope === 'team' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('navTeamTasks')}
            </button>}
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg ${viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
              title="Kanban Board"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('insights')}
              className={`p-1.5 rounded-lg flex items-center gap-1 ${viewMode === 'insights' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600'}`}
              title="Task Performance Insights"
            >
              <BarChart2 className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">{isRtl ? 'التحليلات' : 'Insights'}</span>
            </button>
          </div>

          {canAssignTasks && <button
            onClick={() => {
              setTaskSubmissionError('');
              setNewAssigneeIds([assignableUsers[0]?.id || '']);
              setShowNewModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('createTask')}</span>
          </button>}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={isRtl ? 'بحث في المهام والمشاريع...' : 'Search task or project...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-1.5 ${
              isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
            } rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-hidden`}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'all', label: isRtl ? 'الكل' : 'ALL' },
            { id: 'critical', label: isRtl ? 'حرجة' : 'CRITICAL' },
            { id: 'high', label: isRtl ? 'عالية' : 'HIGH' },
            { id: 'medium', label: isRtl ? 'متوسطة' : 'MEDIUM' },
            { id: 'low', label: isRtl ? 'منخفضة' : 'LOW' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPriorityFilter(p.id)}
              className={`px-3 py-1 rounded-lg uppercase font-semibold text-[11px] transition ${
                priorityFilter === p.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col space-y-3 min-h-[500px]"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="font-bold text-slate-800 text-xs">{col.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 text-[11px] font-bold shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                            task.priority === 'critical'
                              ? 'bg-rose-100 text-rose-700'
                              : task.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {t(`priority_${task.priority}` as any)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {task.progressPercent}%
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 leading-snug line-clamp-2">
                        {task.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 truncate">{task.projectName}</p>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-blue-600">
                              <Paperclip className="w-3 h-3" />
                              {task.attachments.length}
                            </span>
                          )}
                          {task.comments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-600">
                              <MessageSquare className="w-3 h-3" />
                              {task.comments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 text-start">{t('taskTitle')}</th>
                <th className="p-3 text-start">{t('projectName')}</th>
                <th className="p-3 text-start">{t('priority')}</th>
                <th className="p-3 text-start">{t('status')}</th>
                <th className="p-3 text-start">{t('deadline')}</th>
                <th className="p-3 text-start">{t('progress')}</th>
                <th className="p-3 text-start">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="hover:bg-slate-50 cursor-pointer transition"
                >
                  <td className="p-3 font-bold text-slate-900 max-w-sm truncate">{task.title}</td>
                  <td className="p-3 text-slate-600">{task.projectName}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-slate-100 text-slate-700">
                      {t(`priority_${task.priority}` as any)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-700">
                      {t(`status_${task.status}` as any)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-500">{task.dueDate}</td>
                  <td className="p-3 font-bold text-blue-700">{task.progressPercent}%</td>
                  <td className="p-3">
                    <span className="text-blue-600 hover:underline font-semibold">{isRtl ? 'التفاصيل ←' : 'Details →'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: PERFORMANCE INSIGHTS */}
      {viewMode === 'insights' && (
        <div className="pt-2">
          <TaskPerformanceInsights embeddedInDashboard={false} />
        </div>
      )}

      {/* TASK DETAIL DRAWER / MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-xs text-slate-800">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold uppercase text-[10px]">
                  {selectedTask.projectName}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedTask.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span>Due: <b>{selectedTask.dueDate}</b></span>
                  <span>Estimated: <b>{selectedTask.estimatedHours}h</b></span>
                  <span>Logged: <b>{selectedTask.actualHours}h</b></span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              <div className="space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Description</span>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedTask.description}
                </p>
              </div>

              {/* Checklist & Subtasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    {t('subtasks')} ({selectedTask.subtasks.filter((s) => s.isCompleted).length}/{selectedTask.subtasks.length})
                  </span>
                  <span className="font-bold text-blue-700">{selectedTask.progressPercent}% Completed</span>
                </div>

                <div className="space-y-1.5">
                  {selectedTask.subtasks.map((sub) => (
                    <label
                      key={sub.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={sub.isCompleted}
                        onChange={() => {
                          toggleSubtask(selectedTask.id, sub.id);
                          const refreshed = tasks.find((t) => t.id === selectedTask.id);
                          if (refreshed) setSelectedTask(refreshed);
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                      />
                      <span className={`flex-1 ${sub.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {sub.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  {t('attachments')} ({selectedTask.attachments.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedTask.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate font-semibold text-slate-800">{att.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{att.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Action Controls */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-slate-500 block mb-0.5">Current Status</span>
                  <span className="font-bold text-blue-900 text-sm uppercase">
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isFullAccessUser && <button
                    onClick={() => {
                      if (!window.confirm(`Delete task "${selectedTask.title}"? This action cannot be undone.`)) return;
                      deleteTask(selectedTask.id);
                      setSelectedTask(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>}
                  {selectedTask.assigneeIds.includes(currentUser.id) && selectedTask.status !== 'submitted' && selectedTask.status !== 'completed' && (
                    <button
                      onClick={() => {
                        updateTaskStatus(selectedTask.id, 'submitted');
                        const refreshed = tasks.find((t) => t.id === selectedTask.id);
                        if (refreshed) setSelectedTask(refreshed);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow-xs"
                    >
                      {t('submitForReview')}
                    </button>
                  )}

                  {canConfirmCompletion && selectedTask.status === 'submitted' && (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700">
                        KPI
                        <input type="number" min="0" max="100" value={reviewScore} onChange={(event) => setReviewScore(Number(event.target.value))} className="w-12 bg-transparent text-center outline-none" />%
                      </label>
                      <button
                        onClick={() => {
                          reviewTask(selectedTask.id, 'approve', reviewScore, reviewNotes);
                          setSelectedTask(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs"
                      >
                        Approve & Score {reviewScore}%
                      </button>
                      <button
                        onClick={() => {
                          reviewTask(selectedTask.id, 'revise', reviewScore, reviewNotes || 'Needs revision');
                          setSelectedTask(null);
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold transition"
                      >
                        Request Revision
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  {t('comments')} ({selectedTask.comments.length})
                </span>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTask.comments.map((comm) => {
                    const author = users.find((u) => u.id === comm.userId);
                    return (
                      <div key={comm.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900">
                            {author ? author.nameEn : 'Team Member'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700">{comm.content}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a comment or GIS note..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW TASK MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">{t('createTask')}</h3>
              <button onClick={() => setShowNewModal(false)}>✕</button>
            </div>

            {taskSubmissionError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{taskSubmissionError}</div>}

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t('taskTitle')}</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sentinel-2 Soil Moisture Index Extraction"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t('projectName')}</label>
                <input
                  type="text"
                  required
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="e.g. National Agriculture Spatial Monitoring"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t('priority')}</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t('deadline')}</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign to Specialist</label>
                <select
                  value={newAssigneeIds[0]}
                  onChange={(e) => setNewAssigneeIds([e.target.value])}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nameEn} ({u.jobTitleEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description & Requirements</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detail spatial methodologies, projection codes, or expected rasters..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {t('createTask')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
