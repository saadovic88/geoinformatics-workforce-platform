import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart2,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  ChevronLeft,
  CircleDot,
  Clock3,
  FileText,
  Kanban,
  List,
  LoaderCircle,
  MessageSquareText,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { Task, TaskPriority, TaskStatus } from "../../types";
import {
  ACTIVE_TASK_STAGES,
  getAllowedTaskTransitions,
  getReturnTaskStages,
  getVisitedTaskStages,
  isTaskReturnTransition,
  isTaskOverdue,
  TASK_STAGE_META,
  TaskPeriod,
  taskMatchesPeriod,
} from "../../utils/taskWorkflow";
import { TaskPerformanceInsights } from "./TaskPerformanceInsights";
import {
  MAX_TASK_ATTACHMENTS_PER_UPLOAD,
  TASK_ATTACHMENT_ACCEPT,
  formatTaskAttachmentSize,
  validateTaskAttachment,
} from "../../utils/taskAttachments";
import { addCompanyDays, companyDate, isCompanyDateRange } from "../../utils/companyDate";

interface TasksViewProps {
  initialViewMode?: "kanban" | "list" | "insights";
  filterScope?: "my" | "team";
  initialTaskId?: string;
}
type ViewMode = "kanban" | "list" | "insights";
type DetailTab = "overview" | "execution" | "discussion" | "history";

const priorities: TaskPriority[] = ["critical", "high", "medium", "low"];
const priorityMeta: Record<
  TaskPriority,
  { ar: string; en: string; className: string }
> = {
  critical: {
    ar: "حرجة",
    en: "Critical",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  high: {
    ar: "عالية",
    en: "High",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  medium: {
    ar: "متوسطة",
    en: "Medium",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  low: {
    ar: "منخفضة",
    en: "Low",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
};
const stageTone: Record<string, string> = {
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export const TasksView: React.FC<TasksViewProps> = ({
  initialViewMode = "kanban",
  filterScope = "my",
  initialTaskId,
}) => {
  const { currentUser, users, isFullAccessUser } = useAuth();
  const {
    tasks,
    createTask,
    updateTask,
    updateTaskStatus,
    toggleSubtask,
    addTaskSubtask,
    addTaskAttachment,
    uploadTaskAttachment,
    getTaskAttachmentUrl,
    logTaskTime,
    addTaskComment,
    reviewTask,
  } = useData();
  const { isRtl } = useLanguage();
  const c = <T,>(ar: T, en: T) => (isRtl ? ar : en);
  const locale = isRtl ? "ar-EG" : "en-GB";
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [scope, setScope] = useState<"my" | "team">(filterScope);
  const [period, setPeriod] = useState<TaskPeriod>("all");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"all" | TaskPriority>("all");
  const [status, setStatus] = useState<"all" | TaskStatus>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [timeHours, setTimeHours] = useState(1);
  const [reviewScore, setReviewScore] = useState(95);
  const [reviewNotes, setReviewNotes] = useState("");
  const [returnStageTarget, setReturnStageTarget] = useState<TaskStatus | "">("");
  const [editing, setEditing] = useState(false);
  const companyToday = useMemo(() => companyDate(), []);
  const defaultDueDate = useMemo(() => addCompanyDays(companyToday, 7), [companyToday]);
  const [draft, setDraft] = useState({
    title: "",
    projectName: "",
    description: "",
    subtasks: "",
    priority: "medium" as TaskPriority,
    dueDate: defaultDueDate,
    estimatedHours: 8,
    assigneeId: "",
  });
  const [editDraft, setEditDraft] = useState({
    title: "",
    projectName: "",
    description: "",
    dueDate: "",
    estimatedHours: 0,
    priority: "medium" as TaskPriority,
  });

  const directReports = useMemo(
    () =>
      users.filter(
        (user) =>
          user.managerId === currentUser.id &&
          user.status === "active" &&
          user.roleId !== "co_founder",
      ),
    [users, currentUser.id],
  );
  const assignableUsers = useMemo(
    () =>
      (isFullAccessUser
        ? users.filter((user) => user.status === "active")
        : directReports
      ).filter((user) => user.roleId !== "co_founder"),
    [isFullAccessUser, users, directReports],
  );
  const canAssign =
    currentUser.roleId !== "co_founder" &&
    (isFullAccessUser || directReports.length > 0);
  const employeeName = (id: string) => {
    const user = users.find((item) => item.id === id);
    return user ? c(user.nameAr, user.nameEn) : c("عضو فريق", "Team member");
  };
  const canSeeTask = (task: Task) =>
    isFullAccessUser ||
    task.creatorId === currentUser.id ||
    task.assigneeIds.includes(currentUser.id) ||
    task.assigneeIds.some((id) => directReports.some((user) => user.id === id));
  const canEditTask = (task: Task) =>
    isFullAccessUser || task.creatorId === currentUser.id;
  const selectedTask = selectedTaskId
    ? (tasks.find((task) => task.id === selectedTaskId) ?? null)
    : null;

  useEffect(() => {
    if (!initialTaskId) return;
    const task = tasks.find((item) => item.id === initialTaskId);
    if (task && canSeeTask(task)) {
      setSelectedTaskId(task.id);
      setDetailTab("overview");
    }
  }, [initialTaskId, tasks]);
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!canSeeTask(task)) return false;
        if (scope === "my" && !task.assigneeIds.includes(currentUser.id))
          return false;
        if (
          scope === "team" &&
          !isFullAccessUser &&
          !task.assigneeIds.some((id) =>
            directReports.some((user) => user.id === id),
          )
        )
          return false;
        if (!taskMatchesPeriod(task, period)) return false;
        if (priority !== "all" && task.priority !== priority) return false;
        if (status !== "all" && task.status !== status) return false;
        return (
          !query.trim() ||
          `${task.title} ${task.projectName} ${task.description}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase())
        );
      }),
    [
      tasks,
      scope,
      period,
      priority,
      status,
      query,
      currentUser.id,
      directReports,
      isFullAccessUser,
    ],
  );
  const summary = useMemo(
    () => ({
      active: visibleTasks.filter(
        (task) => !["completed", "cancelled"].includes(task.status),
      ).length,
      review: visibleTasks.filter((task) => task.status === "submitted").length,
      blocked: visibleTasks.filter(
        (task) => task.status === "blocked" || isTaskOverdue(task),
      ).length,
      complete: visibleTasks.filter((task) => task.status === "completed")
        .length,
    }),
    [visibleTasks],
  );
  const openTask = (id: string) => {
    setSelectedTaskId(id);
    setDetailTab("overview");
    setFeedback("");
    setEditing(false);
    setReturnStageTarget("");
  };
  const activityText = (action: string) => {
    if (!isRtl) return action;
    if (action === "Created task and assigned team")
      return "تم إنشاء المهمة وتكليف الفريق.";
    if (action.startsWith("Task archived"))
      return "تمت أرشفة المهمة مع الاحتفاظ بالسجل كاملاً.";
    const time = action.match(/^Logged ([\d.]+) working hours$/);
    if (time) return `تم تسجيل ${time[1]} ساعة عمل.`;
    const transition = action.match(/^([a-z_]+)\s*(?:->|→)\s*([a-z_]+)(.*)$/);
    if (
      transition &&
      TASK_STAGE_META[transition[1] as TaskStatus] &&
      TASK_STAGE_META[transition[2] as TaskStatus]
    )
      return `تم نقل المهمة من ${TASK_STAGE_META[transition[1] as TaskStatus].ar} إلى ${TASK_STAGE_META[transition[2] as TaskStatus].ar}${transition[3] || ""}`;
    return action;
  };
  const runTransition = async (
    task: Task,
    nextStatus: TaskStatus,
    transitionNote?: string,
  ) => {
    const returning = isTaskReturnTransition(task.status, nextStatus);
    if ((returning || ['blocked', 'needs_revision', 'cancelled'].includes(nextStatus)) && !transitionNote?.trim()) {
      setFeedback(c('اكتب سببًا واضحًا قبل إرجاع المهمة أو إيقافها أو طلب تعديلها.', 'Add a clear reason before returning, blocking, or requesting a revision.'));
      return;
    }
    setWorking(true);
    setFeedback("");
    const result = await updateTaskStatus(task.id, nextStatus, transitionNote);
    setWorking(false);
    if (!result.ok)
      setFeedback(
        result.message ||
          c(
            "تعذّر حفظ المرحلة. حدّث الصفحة ثم حاول مجدداً.",
            "Could not save the stage. Refresh and try again.",
          ),
      );
    else {
      setNote("");
      setFeedback(
        c(
          "تم حفظ المرحلة وإرسال إشعار للأطراف المعنية.",
          "Stage saved and relevant people were notified.",
        ),
      );
    }
  };
  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.assigneeId || !draft.dueDate)
      return setFeedback(
        c(
          "أدخل عنوان المهمة، والموظف المكلّف، وتاريخ الاستحقاق.",
          "Enter a task title, assignee, and due date.",
        ),
      );
    if (!isCompanyDateRange(companyToday, draft.dueDate))
      return setFeedback(
        c(
          "تحقق من تاريخ الاستحقاق؛ يجب ألا يسبق تاريخ اليوم.",
          "The due date cannot be before the company calendar day.",
        ),
      );
    const invalidFile = createFiles.map(validateTaskAttachment).find(Boolean);
    if (invalidFile)
      return setFeedback(
        isRtl
          ? `المرفق غير صالح: ${invalidFile}`
          : `Invalid attachment: ${invalidFile}`,
      );
    setWorking(true);
    setFeedback("");
    const result = await createTask({
      title: draft.title.trim(),
      projectName: draft.projectName.trim() || c("أعمال عامة", "General work"),
      description: draft.description.trim(),
      departmentId: currentUser.departmentId,
      creatorId: currentUser.id,
      assigneeIds: [draft.assigneeId],
      priority: draft.priority,
      status: "not_started",
      startDate: companyToday,
      dueDate: draft.dueDate,
      deadlineTime: "17:00",
      estimatedHours: Math.max(1, Number(draft.estimatedHours) || 1),
      actualHours: 0,
      progressPercent: 0,
      subtasks: draft.subtasks
        .split("\n")
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title, index) => ({
          id: `sub_${Date.now()}_${index}`,
          title,
          isCompleted: false,
        })),
      attachments: [],
    });
    if (!result.ok || !result.taskId) {
      setWorking(false);
      return setFeedback(
        result.message || c("تعذّر إنشاء المهمة.", "Could not create task."),
      );
    }
    const uploadResults = await Promise.all(
      createFiles.map((file) => uploadTaskAttachment(result.taskId!, file)),
    );
    setWorking(false);
    const failed = uploadResults.filter((upload) => !upload.ok);
    setDraft({
      title: "",
      projectName: "",
      description: "",
      subtasks: "",
      priority: "medium",
      dueDate: defaultDueDate,
      estimatedHours: 8,
      assigneeId: "",
    });
    setCreateFiles([]);
    setShowCreate(false);
    setScope("team");
    if (failed.length)
      setFeedback(
        c(
          `تم إنشاء المهمة، لكن تعذّر رفع ${failed.length} مرفق. افتح المهمة وحاول مجددًا.`,
          `The task was created, but ${failed.length} attachment(s) could not be uploaded. Open the task and retry.`,
        ),
      );
  };
  const saveEdit = () => {
    if (!selectedTask || !editDraft.title.trim() || !editDraft.dueDate)
      return setFeedback(
        c(
          "عنوان المهمة وتاريخ الاستحقاق مطلوبان.",
          "A task title and due date are required.",
        ),
      );
    updateTask({
      ...selectedTask,
      ...editDraft,
      title: editDraft.title.trim(),
      projectName:
        editDraft.projectName.trim() || c("أعمال عامة", "General work"),
      description: editDraft.description.trim(),
    });
    setEditing(false);
    setFeedback(c("تم حفظ تفاصيل المهمة.", "Task details saved."));
  };
  const stageRail = (task: Task) => {
    const visited = getVisitedTaskStages(task);
    // Keep the visual rail focused on the normal delivery path. Exception
    // stages are shown by the prominent current-stage card below instead of
    // making the rail too wide to understand on a phone.
    const stages: TaskStatus[] = ["not_started", "in_progress", "submitted", "completed"];
    return (
      <div
        className="rounded-xl border border-slate-200 bg-slate-50 p-2"
        aria-label={c("مسار مراحل المهمة", "Task workflow stages")}
      >
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {stages.map((stage) => {
            const current = task.status === stage;
            const done = visited.has(stage) && !current;
            const Icon = done ? CheckCircle2 : current ? CircleDot : Clock3;
            return (
              <li key={stage} className="min-w-0">
                <div
                  className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 ${current ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400"}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap text-[10px] font-bold">
                    {c(TASK_STAGE_META[stage].ar, TASK_STAGE_META[stage].en)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };
  const taskCard = (task: Task) => {
    const meta = TASK_STAGE_META[task.status];
    const overdue = isTaskOverdue(task);
    const completedSteps = task.subtasks.filter(
      (step) => step.isCompleted,
    ).length;
    return (
      <button
        type="button"
        key={task.id}
        onClick={() => openTask(task.id)}
        className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span
            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityMeta[task.priority].className}`}
          >
            {c(priorityMeta[task.priority].ar, priorityMeta[task.priority].en)}
          </span>
          <span
            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${stageTone[meta.tone]}`}
          >
            {c(meta.ar, meta.en)}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-slate-900">
          {task.title}
        </h3>
        <p className="mt-1 truncate text-[11px] text-slate-500">
          {task.projectName || c("أعمال عامة", "General work")}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${task.progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {task.dueDate}
          </span>
          <span className="font-bold text-slate-700">
            {task.progressPercent}%
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
          <span>
            <CheckSquare2 className="me-1 inline h-3 w-3" />
            {completedSteps}/{task.subtasks.length}
          </span>
          <span
            className={overdue ? "font-bold text-rose-600" : "text-blue-600"}
          >
            {overdue
              ? c("متأخرة", "Overdue")
              : c("فتح التفاصيل", "Open details")}
          </span>
        </div>
      </button>
    );
  };
  const columns: TaskStatus[] =
    period === "archive" ? ["cancelled"] : [...ACTIVE_TASK_STAGES, "overdue"];
  const detailTabs: {
    id: DetailTab;
    ar: string;
    en: string;
    icon: typeof FileText;
  }[] = [
    { id: "overview", ar: "نظرة عامة", en: "Overview", icon: FileText },
    { id: "execution", ar: "التنفيذ", en: "Execution", icon: CheckSquare2 },
    {
      id: "discussion",
      ar: "المناقشة",
      en: "Discussion",
      icon: MessageSquareText,
    },
    { id: "history", ar: "السجل", en: "History", icon: Clock3 },
  ];

  return (
    <section dir={isRtl ? "rtl" : "ltr"} className="space-y-4 text-slate-900">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckSquare2 className="h-5 w-5 text-blue-400" />
                <h1 className="text-lg font-bold">
                  {c("إدارة المهام وسير العمل", "Task workflow management")}
                </h1>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {c(
                  "كل مهمة لها مراحل واضحة، متابعة، وسجل دائم يمكن الرجوع إليه.",
                  "Every task has clear stages, follow-up, and a retained company record.",
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-lg border border-white/15 bg-white/5 p-1">
                {(["my", "team"] as const).map((item) =>
                  item === "team" && !canAssign ? null : (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setScope(item)}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold ${scope === item ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
                    >
                      {item === "my"
                        ? c("مهامي", "My tasks")
                        : c("مهام الفريق", "Team tasks")}
                    </button>
                  ),
                )}
              </div>
              {canAssign && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft((value) => ({
                      ...value,
                      assigneeId:
                        value.assigneeId || assignableUsers[0]?.id || "",
                    }));
                    setFeedback("");
                    setShowCreate(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  {c("إنشاء مهمة", "Create task")}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="relative">
            <Search
              className={`absolute top-2.5 h-4 w-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={c(
                "ابحث في العنوان أو المشروع أو الوصف...",
                "Search title, project, or description...",
              )}
              className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs outline-none transition focus:border-blue-500 ${isRtl ? "pr-9 pl-3" : "pl-9 pr-3"}`}
            />
          </label>
          <div className="flex overflow-x-auto rounded-lg bg-slate-100 p-1">
            {(["week", "month", "year", "all", "archive"] as TaskPeriod[]).map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-bold ${period === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {
                    (
                      {
                        week: c("الأسبوع", "Week"),
                        month: c("الشهر", "Month"),
                        year: c("السنة", "Year"),
                        all: c("كل السجل", "All records"),
                        archive: c("الأرشيف", "Archive"),
                      } as Record<TaskPeriod, string>
                    )[value]
                  }
                </button>
              ),
            )}
          </div>
          <div className="flex justify-end rounded-lg bg-slate-100 p-1">
            {(["kanban", "list", "insights"] as ViewMode[]).map((value) => {
              const Icon =
                value === "kanban"
                  ? Kanban
                  : value === "list"
                    ? List
                    : BarChart2;
              const label =
                value === "kanban"
                  ? c("لوحة المراحل", "Stage board")
                  : value === "list"
                    ? c("القائمة", "List")
                    : c("التحليلات", "Insights");
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setViewMode(value)}
                  title={label}
                  aria-label={label}
                  className={`rounded-md p-2 ${viewMode === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as "all" | TaskPriority)
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold"
          >
            <option value="all">{c("كل الأولويات", "All priorities")}</option>
            {priorities.map((item) => (
              <option key={item} value={item}>
                {c(priorityMeta[item].ar, priorityMeta[item].en)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | TaskStatus)
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold"
          >
            <option value="all">{c("كل المراحل", "All stages")}</option>
            {(
              [...ACTIVE_TASK_STAGES, "cancelled", "overdue"] as TaskStatus[]
            ).map((item) => (
              <option key={item} value={item}>
                {c(TASK_STAGE_META[item].ar, TASK_STAGE_META[item].en)}
              </option>
            ))}
          </select>
          {(query ||
            priority !== "all" ||
            status !== "all" ||
            period !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPriority("all");
                setStatus("all");
                setPeriod("all");
              }}
              className="text-[11px] font-bold text-blue-700 hover:underline"
            >
              {c("مسح الفلاتر", "Clear filters")}
            </button>
          )}
          <span className="ms-auto flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            {c(
              "المهام لا تُحذف نهائياً؛ تبقى في أرشيف الشركة.",
              "Tasks remain permanently in the company archive.",
            )}
          </span>
        </div>
      </header>
      {viewMode !== "insights" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              label: c("قيد المتابعة", "Active"),
              value: summary.active,
              className: "text-blue-700",
            },
            {
              label: c("بانتظار المراجعة", "Under review"),
              value: summary.review,
              className: "text-amber-700",
            },
            {
              label: c("تحتاج متابعة", "Need attention"),
              value: summary.blocked,
              className: "text-rose-700",
            },
            {
              label: c("مكتملة", "Completed"),
              value: summary.complete,
              className: "text-emerald-700",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <p className="text-[10px] text-slate-500">{metric.label}</p>
              <p className={`mt-1 text-xl font-black ${metric.className}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      )}
      {viewMode === "insights" ? (
        <TaskPerformanceInsights />
      ) : visibleTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Archive className="mx-auto h-9 w-9 text-slate-300" />
          <h2 className="mt-3 text-sm font-bold">
            {c("لا توجد مهام مطابقة", "No matching tasks")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {c(
              "غيّر الفترة أو الفلاتر للوصول إلى السجل المطلوب.",
              "Change the period or filters to find the retained record.",
            )}
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {columns.map((column) => {
            const columnTasks = visibleTasks.filter(
              (task) =>
                task.status === column ||
                (column === "overdue" &&
                  task.status !== "cancelled" &&
                  task.status !== "completed" &&
                  isTaskOverdue(task)),
            );
            if (!columnTasks.length) return null;
            const meta = TASK_STAGE_META[column];
            return (
              <section
                key={column}
                className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-2.5"
              >
                <header className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-bold">
                    {c(meta.ar, meta.en)}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold shadow-sm">
                    {columnTasks.length}
                  </span>
                </header>
                <div className="space-y-2.5">{columnTasks.map(taskCard)}</div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500 sm:grid-cols-[minmax(0,2fr)_minmax(130px,1fr)_110px_100px]">
            <span>{c("المهمة", "Task")}</span>
            <span className="hidden sm:block">{c("المكلّف", "Assignee")}</span>
            <span className="hidden sm:block">{c("المرحلة", "Stage")}</span>
            <span>{c("الاستحقاق", "Due")}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleTasks.map((task) => (
              <button
                type="button"
                key={task.id}
                onClick={() => openTask(task.id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 text-start transition hover:bg-slate-50 sm:grid-cols-[minmax(0,2fr)_minmax(130px,1fr)_110px_100px]"
              >
                <div>
                  <p className="truncate text-sm font-bold">{task.title}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {task.projectName}
                  </p>
                </div>
                <span className="hidden truncate text-xs text-slate-600 sm:block">
                  {task.assigneeIds.map(employeeName).join("، ")}
                </span>
                <span
                  className={`hidden self-center rounded-md border px-2 py-1 text-center text-[10px] font-bold sm:block ${stageTone[TASK_STAGE_META[task.status].tone]}`}
                >
                  {c(
                    TASK_STAGE_META[task.status].ar,
                    TASK_STAGE_META[task.status].en,
                  )}
                </span>
                <span className="self-center text-[11px] text-slate-500">
                  {task.dueDate}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {selectedTask && renderTaskDetailsModal()}
      {showCreate && renderCreateTaskModal()}
    </section>
  );

  // Keep this as a render helper, not a nested React component. A component
  // declared inside TasksView gets a new identity on every state update and
  // remounts while a user is typing a return reason.
  function renderTaskDetailsModal() {
    if (!selectedTask) return null;
    const overdue = isTaskOverdue(selectedTask);
    const isClosed = selectedTask.status === "cancelled";
    const canWorkOnTask =
      selectedTask.assigneeIds.includes(currentUser.id) ||
      canEditTask(selectedTask);
    const isTaskManager = canEditTask(selectedTask);
    const allowedTransitions = getAllowedTaskTransitions(selectedTask.status).filter(
      (next) =>
        (next !== "completed" && next !== "needs_revision" || isTaskManager) &&
        (next !== "cancelled" || isTaskManager) &&
        (selectedTask.status !== "completed" || isTaskManager),
    );
    const returnStage: Partial<Record<TaskStatus, TaskStatus>> = {
      in_progress: "not_started",
      blocked: "in_progress",
      submitted: "in_progress",
      needs_revision: "in_progress",
      completed: "submitted",
      overdue: "in_progress",
    };
    const backTo = returnStage[selectedTask.status];
    const primaryNext: Partial<Record<TaskStatus, TaskStatus>> = {
      not_started: "in_progress",
      in_progress: "submitted",
      blocked: "in_progress",
      needs_revision: "submitted",
    };
    const advanceTo = primaryNext[selectedTask.status];
    const returnTargets = (isTaskManager
      ? getReturnTaskStages(selectedTask.status)
      : backTo ? [backTo] : []
    ).filter((stage) => allowedTransitions.includes(stage));
    const hasDirectReturn = Boolean(
      backTo && allowedTransitions.includes(backTo) && returnTargets.length <= 1,
    );
    const returnReasonRequired = Boolean(returnStageTarget) || hasDirectReturn;
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedTaskId(null);
        }}
      >
        <article
          role="dialog"
          aria-modal="true"
          aria-label={c("تفاصيل المهمة", "Task details")}
          className="max-h-[96dvh] w-full max-w-5xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
        >
          <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 p-4 backdrop-blur">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityMeta[selectedTask.priority].className}`}
                >
                  {c(
                    priorityMeta[selectedTask.priority].ar,
                    priorityMeta[selectedTask.priority].en,
                  )}
                </span>
                <span
                  className={`rounded-md border px-2 py-1 text-[10px] font-bold ${stageTone[TASK_STAGE_META[selectedTask.status].tone]}`}
                >
                  {c(
                    TASK_STAGE_META[selectedTask.status].ar,
                    TASK_STAGE_META[selectedTask.status].en,
                  )}
                </span>
                {overdue && (
                  <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
                    {c("متأخرة", "Overdue")}
                  </span>
                )}
              </div>
              <h2 className="mt-2 truncate text-lg font-bold">
                {selectedTask.title}
              </h2>
              <p className="truncate text-xs text-slate-500">
                {selectedTask.projectName || c("أعمال عامة", "General work")}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {canEditTask(selectedTask) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditDraft({
                      title: selectedTask.title,
                      projectName: selectedTask.projectName,
                      description: selectedTask.description,
                      dueDate: selectedTask.dueDate,
                      estimatedHours: selectedTask.estimatedHours,
                      priority: selectedTask.priority,
                    });
                    setEditing(true);
                    setDetailTab("overview");
                  }}
                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                  title={c("تعديل تفاصيل المهمة", "Edit task details")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label={c("إغلاق", "Close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>
          <div className="space-y-4 p-4 sm:p-5">
            {stageRail(selectedTask)}
            {feedback && (
              <div
                role="status"
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800"
              >
                {feedback}
              </div>
            )}
            <nav
              aria-label={c("أقسام تفاصيل المهمة", "Task detail sections")}
              className="flex overflow-x-auto border-b border-slate-200"
            >
              {detailTabs.map(({ id, ar, en, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setDetailTab(id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold ${detailTab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c(ar, en)}
                </button>
              ))}
            </nav>
            {detailTab === "overview" && (
              <div className="space-y-4">
                {editing && (
                  <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:grid-cols-2">
                    <label className="text-xs font-bold">
                      {c("عنوان المهمة", "Task title")}
                      <input
                        value={editDraft.title}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            title: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-normal"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      {c("المشروع", "Project")}
                      <input
                        value={editDraft.projectName}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            projectName: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-normal"
                      />
                    </label>
                    <label className="text-xs font-bold sm:col-span-2">
                      {c(
                        "الوصف ومعيار القبول",
                        "Description and acceptance criteria",
                      )}
                      <textarea
                        value={editDraft.description}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            description: event.target.value,
                          })
                        }
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-normal"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      {c("تاريخ الاستحقاق", "Due date")}
                      <input
                        type="date"
                        value={editDraft.dueDate}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            dueDate: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-normal"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      {c("الساعات المقدرة", "Estimated hours")}
                      <input
                        type="number"
                        min="1"
                        value={editDraft.estimatedHours}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            estimatedHours: Number(event.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-normal"
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        <Save className="me-1 inline h-4 w-4" />
                        {c("حفظ التعديلات", "Save changes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600"
                      >
                        {c("إلغاء", "Cancel")}
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    [
                      c("المكلّفون", "Assignees"),
                      selectedTask.assigneeIds.map(employeeName).join("، "),
                    ],
                    [c("تاريخ الاستحقاق", "Due date"), selectedTask.dueDate],
                    [
                      c("الوقت المسجل / المقدر", "Logged / estimated"),
                      `${selectedTask.actualHours} / ${selectedTask.estimatedHours} ${c("ساعة", "h")}`,
                    ],
                    [
                      c("نسبة الإنجاز", "Progress"),
                      `${selectedTask.progressPercent}%`,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className="mt-1 truncate text-xs font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700">
                    {c("الوصف والمتطلبات", "Description and requirements")}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
                    {selectedTask.description ||
                      c(
                        "لا يوجد وصف إضافي لهذه المهمة.",
                        "No additional description was provided.",
                      )}
                  </p>
                </div>
                {!isClosed && (
                  <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-sky-400/35 dark:bg-slate-900">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-blue-950 dark:text-sky-100">{c(`المرحلة الحالية: ${TASK_STAGE_META[selectedTask.status].ar}`, `Current stage: ${TASK_STAGE_META[selectedTask.status].en}`)}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-200 dark:bg-slate-800 dark:text-sky-200 dark:ring-sky-300/30">{c('كل تحديث يصل للمدير', 'Every update reaches the manager')}</span>
                    </div>
                    <h3 className="text-xs font-bold text-blue-950 dark:text-sky-100">
                      {c("الإجراء التالي", "Next action")}
                    </h3>
                    <p className="mt-1 text-[11px] text-blue-800 dark:text-sky-200">
                      {c(
                        returnReasonRequired
                          ? "سبب الإرجاع مطلوب عند إعادة المهمة. ستصبح المهمة نشطة مرة أخرى، وسيظهر السبب في السجل ويرسل للأطراف المعنية."
                          : "اكتب سبب التوقف أو التعديل أو الأرشفة عند الحاجة؛ سيظهر في السجل ويرسل للأطراف المعنية.",
                        returnReasonRequired
                          ? "A return reason is required when returning work. The task will become active again, and the reason is saved in the record and sent to relevant people."
                          : "Add a reason for a block, revision, or archive when needed; it is saved in the record and sent to relevant people.",
                      )}
                    </p>
                    {returnReasonRequired && (
                      <label className="mt-2 block text-[11px] font-extrabold text-amber-900 dark:text-amber-200">
                        {c("سبب الإرجاع (مطلوب عند الإرجاع)", "Reason for return (required when returning)")}
                      </label>
                    )}
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={c(
                        returnReasonRequired ? "اكتب سبب الإرجاع بوضوح..." : "اكتب ملاحظة واضحة عند الحاجة...",
                        returnReasonRequired ? "Explain why this task is being returned..." : "Write a clear note when needed...",
                      )}
                      rows={2}
                      aria-required={returnReasonRequired}
                      className="mt-2 w-full rounded-lg border border-blue-200 bg-white p-2.5 text-xs dark:border-sky-300/35 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {advanceTo && allowedTransitions.includes(advanceTo) && (
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => runTransition(selectedTask, advanceTo, note)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {c(`إتمام المرحلة: ${TASK_STAGE_META[advanceTo].ar}`, `Complete stage: ${TASK_STAGE_META[advanceTo].en}`)}
                        </button>
                      )}
                      {backTo && allowedTransitions.includes(backTo) && returnTargets.length <= 1 && (
                        <button
                          type="button"
                          disabled={working || !note.trim()}
                          onClick={() => runTransition(selectedTask, backTo, note)}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-300/50 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/50"
                        >
                          {c(`إرجاع إلى: ${TASK_STAGE_META[backTo].ar}`, `Return to: ${TASK_STAGE_META[backTo].en}`)}
                        </button>
                      )}
                      {returnTargets.length > 1 && (
                        <div className="flex min-w-[15rem] flex-1 flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-300/45 dark:bg-amber-950/50 sm:flex-row sm:items-center">
                          <label className="text-[10px] font-extrabold text-amber-900 dark:text-amber-100">
                            {c("إرجاع المرحلة", "Return stage")}
                            <select
                              value={returnStageTarget}
                              onChange={(event) => setReturnStageTarget(event.target.value as TaskStatus)}
                              className="ms-1.5 min-h-9 max-w-full rounded-md border border-amber-200 bg-white px-2 text-xs font-bold text-slate-800 dark:border-amber-300/45 dark:bg-slate-800 dark:text-amber-50"
                            >
                              <option value="">{c("اختر مرحلة سابقة", "Choose an earlier stage")}</option>
                              {returnTargets.map((stage) => <option key={stage} value={stage}>{c(TASK_STAGE_META[stage].ar, TASK_STAGE_META[stage].en)}</option>)}
                            </select>
                          </label>
                          <button
                            type="button"
                            disabled={working || !returnStageTarget || !note.trim()}
                            onClick={() => returnStageTarget && void runTransition(selectedTask, returnStageTarget, note)}
                            className="min-h-9 rounded-md border border-amber-300 bg-white px-2.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-300/50 dark:bg-slate-800 dark:text-amber-100 dark:hover:bg-amber-900/50"
                          >
                            {c("تأكيد الإرجاع", "Confirm return")}
                          </button>
                        </div>
                      )}
                      {allowedTransitions.filter((next) => next !== advanceTo && next !== backTo && !returnTargets.includes(next)).map((next) => (
                        <button
                          type="button"
                          key={next}
                          disabled={working}
                          onClick={() =>
                            runTransition(selectedTask, next, note)
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-60 ${next === "cancelled" ? "border-slate-300 bg-white text-slate-700" : next === "blocked" ? "border-rose-200 bg-rose-600 text-white" : "border-blue-600 bg-blue-600 text-white"}`}
                        >
                          {next === "cancelled"
                            ? c("أرشفة المهمة", "Archive task")
                            : c(
                                TASK_STAGE_META[next].ar,
                                TASK_STAGE_META[next].en,
                              )}
                        </button>
                      ))}
                      {working && (
                        <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
                      )}
                    </div>
                  </section>
                )}
                {isTaskManager && selectedTask.status === "submitted" && (
                  <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <h3 className="text-xs font-bold text-emerald-950">
                      {c(
                        "اعتماد المسؤول وتقييم مؤشر الأداء",
                        "Manager approval and performance score",
                      )}
                    </h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[112px_1fr_auto_auto]">
                      <label className="rounded-lg border border-emerald-200 bg-white px-2 py-2 text-xs">
                        {c("التقييم", "Score")}{" "}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={reviewScore}
                          onChange={(event) =>
                            setReviewScore(Number(event.target.value))
                          }
                          className="w-12 text-center font-bold outline-none"
                        />
                        %
                      </label>
                      <input
                        value={reviewNotes}
                        onChange={(event) => setReviewNotes(event.target.value)}
                        placeholder={c(
                          "ملاحظات الاعتماد أو التعديل...",
                          "Approval or revision notes...",
                        )}
                        className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setWorking(true);
                          const result = await reviewTask(
                            selectedTask.id,
                            "approve",
                            reviewScore,
                            reviewNotes,
                          );
                          setWorking(false);
                          setFeedback(
                            result.message ||
                              c("تم اعتماد المهمة.", "Task approved."),
                          );
                        }}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        {c("اعتماد", "Approve")}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!reviewNotes.trim())
                            return setFeedback(
                              c(
                                "اكتب ملاحظات التعديل أولاً.",
                                "Enter revision notes first.",
                              ),
                            );
                          setWorking(true);
                          const result = await reviewTask(
                            selectedTask.id,
                            "revise",
                            reviewScore,
                            reviewNotes,
                          );
                          setWorking(false);
                          setFeedback(
                            result.message ||
                              c(
                                "أُعيدت المهمة للتعديل.",
                                "Task returned for revision.",
                              ),
                          );
                        }}
                        className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white"
                      >
                        {c("طلب تعديل", "Request revision")}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            )}
            {detailTab === "execution" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <section>
                  <h3 className="mb-2 text-xs font-bold">
                    {c("قائمة خطوات التنفيذ", "Execution checklist")}
                  </h3>
                  {selectedTask.subtasks.length ? (
                    <div className="space-y-2">
                      {selectedTask.subtasks.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={async () => {
                              setWorking(true);
                              const result = await toggleSubtask(
                                selectedTask.id,
                                item.id,
                              );
                              setWorking(false);
                              if (!result.ok)
                                setFeedback(
                                  result.message ||
                                    c(
                                      "تعذّر حفظ الخطوة.",
                                      "Could not save the checklist item.",
                                    ),
                                );
                            }}
                            disabled={
                              working ||
                              !selectedTask.assigneeIds.includes(
                                currentUser.id,
                              ) ||
                              isClosed
                            }
                          />
                          <span
                            className={
                              item.isCompleted
                                ? "text-slate-400 line-through"
                                : ""
                            }
                          >
                            {item.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                      {c("لم تُضف خطوات تنفيذ بعد.", "No checklist items yet.")}
                    </p>
                  )}
                  {!isClosed && canWorkOnTask && (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={newSubtask}
                        onChange={(event) => setNewSubtask(event.target.value)}
                        placeholder={c(
                          "أضف خطوة تنفيذ...",
                          "Add a checklist item...",
                        )}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSubtask.trim()) {
                            addTaskSubtask(selectedTask.id, newSubtask);
                            setNewSubtask("");
                          }
                        }}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold">
                    {c("تسجيل وقت العمل", "Log working time")}
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">
                      {c(
                        "إجمالي الوقت المسجل حتى الآن",
                        "Total time logged so far",
                      )}
                    </p>
                    <p className="mt-1 text-xl font-black">
                      {selectedTask.actualHours} {c("ساعة", "hours")}
                    </p>
                    {!isClosed &&
                      (isFullAccessUser ||
                        selectedTask.assigneeIds.includes(currentUser.id)) && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="number"
                            min="0.25"
                            max="24"
                            step="0.25"
                            value={timeHours}
                            onChange={(event) =>
                              setTimeHours(Number(event.target.value))
                            }
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              logTaskTime(selectedTask.id, timeHours)
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            <Clock3 className="me-1 inline h-4 w-4" />
                            {c("تسجيل", "Log")}
                          </button>
                        </div>
                      )}
                  </div>
                </section>
                <section className="lg:col-span-2">
                  <h3 className="mb-2 text-xs font-bold">
                    {c("المرفقات والروابط", "Attachments and links")} (
                    {selectedTask.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedTask.attachments.map((attachment) => (
                      <button
                        type="button"
                        key={attachment.id}
                        onClick={() => void openAttachment(attachment)}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-start text-xs hover:border-blue-300"
                      >
                        <span className="min-w-0 truncate">
                          <Paperclip className="me-1 inline h-4 w-4 text-blue-600" />
                          {attachment.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {attachment.size || c("رابط", "Link")}
                        </span>
                      </button>
                    ))}
                  </div>
                  {!isClosed && canWorkOnTask && (
                    <div className="mt-2 space-y-2">
                      <label className="block rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-2 text-[11px] font-bold text-slate-700">
                        {c("إرسال ملف صغير", "Send a small file")}
                        <input
                          type="file"
                          multiple
                          accept={TASK_ATTACHMENT_ACCEPT}
                          onChange={(event) => selectAttachmentFiles(event.target.files)}
                          className="mt-1 block w-full text-[11px] file:me-2 file:rounded file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-[10px] file:font-bold file:text-white"
                        />
                        <span className="mt-1 block font-normal text-slate-500">{c("صور أو Word أو PowerPoint أو Excel فقط، حتى 5 م.ب للملف.", "Images, Word, PowerPoint, or Excel only, up to 5 MB each.")}</span>
                      </label>
                      {attachmentFiles.length > 0 && <div className="flex flex-wrap gap-2">{attachmentFiles.map((file, index) => <span key={`${file.name}-${index}`} className="rounded bg-slate-100 px-2 py-1 text-[10px]">{file.name} <button type="button" className="ms-1 text-rose-600" onClick={() => setAttachmentFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}<button type="button" disabled={working} onClick={async () => { setWorking(true); const results = await Promise.all(attachmentFiles.map((file) => uploadTaskAttachment(selectedTask.id, file))); setWorking(false); const failed = results.filter((result) => !result.ok); if (failed.length) setFeedback(failed[0].message || c("تعذّر رفع بعض الملفات.", "Some files could not be uploaded.")); else { setAttachmentFiles([]); setFeedback(c("تم إرسال الملفات وحفظها مع المهمة.", "Files were sent and saved with the task.")); } }} className="rounded bg-blue-600 px-3 py-1 text-[10px] font-bold text-white disabled:opacity-60">{c("رفع الملفات", "Upload files")}</button></div>}
                    <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                      <input
                        value={attachmentName}
                        onChange={(event) =>
                          setAttachmentName(event.target.value)
                        }
                        placeholder={c(
                          "اسم الرابط أو المرفق",
                          "Attachment or link name",
                        )}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <input
                        type="url"
                        value={attachmentUrl}
                        onChange={(event) =>
                          setAttachmentUrl(event.target.value)
                        }
                        placeholder="https://"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (attachmentName.trim() && attachmentUrl.trim()) {
                            addTaskAttachment(
                              selectedTask.id,
                              attachmentName,
                              attachmentUrl,
                            );
                            setAttachmentName("");
                            setAttachmentUrl("");
                          }
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                      >
                        {c("إضافة الرابط", "Add link")}
                      </button>
                    </div></div>
                  )}
                </section>
              </div>
            )}
            {detailTab === "discussion" && (
              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold">
                      {c("مناقشة المهمة", "Task discussion")}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {c(
                        "كل تعليق محفوظ في سجل المهمة ويصل إشعار للأطراف المعنية.",
                        "Every comment is retained in the task record and notifies relevant people.",
                      )}
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold">
                    {selectedTask.comments.length}
                  </span>
                </div>
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                  {selectedTask.comments.length ? (
                    selectedTask.comments.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <b>{employeeName(item.userId)}</b>
                          <time className="shrink-0 text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleString(locale)}
                          </time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">
                          {item.content}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">
                      {c(
                        "لا توجد تعليقات بعد. ابدأ بتوثيق تحديث مهني للمهمة.",
                        "No comments yet. Start documenting a professional task update.",
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={4000}
                    rows={2}
                    placeholder={c(
                      "اكتب تحديثاً أو سؤالاً واضحاً للفريق...",
                      "Write a clear update or question for the team...",
                    )}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    disabled={working || !comment.trim()}
                    onClick={async () => {
                      setWorking(true);
                      const result = await addTaskComment(
                        selectedTask.id,
                        comment,
                      );
                      setWorking(false);
                      if (!result.ok)
                        setFeedback(
                          result.message ||
                            c(
                              "تعذّر إرسال التعليق.",
                              "Could not send comment.",
                            ),
                        );
                      else setComment("");
                    }}
                    className="self-end rounded-lg bg-blue-600 p-2.5 text-white disabled:opacity-60"
                    aria-label={c("إرسال التعليق", "Send comment")}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {comment.length}/4000
                </p>
              </section>
            )}
            {detailTab === "history" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <section>
                  <h3 className="mb-2 text-xs font-bold">
                    {c("سجل مراحل المهمة", "Stage history")}
                  </h3>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {(selectedTask.stageHistory || []).length ? (
                      [...(selectedTask.stageHistory || [])]
                        .reverse()
                        .map((entry) => (
                          <article
                            key={entry.id}
                            className="border-s-2 border-blue-300 ps-3 py-1 text-xs"
                          >
                            <p className="font-bold">
                              {c(
                                TASK_STAGE_META[entry.from].ar,
                                TASK_STAGE_META[entry.from].en,
                              )}{" "}
                              <ArrowRight
                                className={`mx-1 inline h-3 w-3 ${isRtl ? "rotate-180" : ""}`}
                              />{" "}
                              {c(
                                TASK_STAGE_META[entry.to].ar,
                                TASK_STAGE_META[entry.to].en,
                              )}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {employeeName(entry.actorId)} ·{" "}
                              {new Date(entry.timestamp).toLocaleString(locale)}
                            </p>
                            {entry.note && (
                              <p className="mt-1 text-slate-600">
                                {entry.note}
                              </p>
                            )}
                          </article>
                        ))
                    ) : (
                      <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                        {c(
                          "لا يوجد سجل مراحل منظّم لهذه المهمة القديمة.",
                          "No structured stage history exists for this legacy task.",
                        )}
                      </p>
                    )}
                  </div>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold">
                    {c("سجل النشاط", "Activity log")}
                  </h3>
                  <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {[...selectedTask.activityLogs].reverse().map((entry) => (
                      <article
                        key={entry.id}
                        className="flex items-start justify-between gap-3 p-3 text-xs"
                      >
                        <div>
                          <b>{employeeName(entry.userId)}</b>
                          <p className="mt-1 text-slate-600">
                            {activityText(entry.action)}
                          </p>
                        </div>
                        <time className="shrink-0 text-[10px] text-slate-400">
                          {new Date(entry.timestamp).toLocaleString(locale)}
                        </time>
                      </article>
                    ))}
                  </div>
                </section>
                <div className="lg:col-span-2 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                  <Archive className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <p>
                    {c(
                      "هذه المهمة جزء من سجل الشركة الدائم. عند الأرشفة لا تُحذف تفاصيلها أو مناقشاتها أو قراراتها، وتبقى متاحة في فلتر الأرشيف للمستخدمين المصرّح لهم.",
                      "This task is part of the permanent company record. Archiving retains its details, discussion, and decisions for authorised users.",
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    );
  }
  const selectAttachmentFiles = (files: FileList | null, forCreate = false) => {
    const selected = Array.from(files || []);
    const invalid = selected.map(validateTaskAttachment).find(Boolean);
    if (invalid) {
      setFeedback(
        isRtl
          ? `المرفق غير صالح: ${invalid}`
          : `Invalid attachment: ${invalid}`,
      );
      return;
    }
    const setter = forCreate ? setCreateFiles : setAttachmentFiles;
    setter((current) =>
      [...current, ...selected].slice(0, MAX_TASK_ATTACHMENTS_PER_UPLOAD),
    );
  };
  const openAttachment = async (attachment: Task["attachments"][number]) => {
    const result = await getTaskAttachmentUrl(attachment);
    if (!result.ok || !result.url) {
      setFeedback(
        result.message || c("تعذّر فتح المرفق.", "Could not open attachment."),
      );
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  // Keep this as a render helper instead of a component declaration inside
  // TasksView. A nested React component gets a new identity on each keystroke,
  // which remounts its inputs and causes focus to be lost while typing.
  function renderCreateTaskModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
        <form
          onSubmit={submitCreate}
          className="max-h-[95dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        >
          <header className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h2 className="text-base font-bold">
                {c("إنشاء مهمة جديدة", "Create a new task")}
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                {c(
                  "اكتب نتيجة واضحة وخطوات تنفيذ قابلة للمتابعة. سيصل تنبيه تفصيلي للموظف المكلّف.",
                  "Set a clear outcome and trackable steps. The assignee receives a detailed alert.",
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              aria-label={c("إغلاق", "Close")}
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="space-y-3 p-4">
            {feedback && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {feedback}
              </div>
            )}
            <label className="block text-xs font-bold">
              {c("عنوان المهمة", "Task title")}
              <input
                required
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder={c(
                  "مثال: إعداد خريطة متابعة المشروع",
                  "Example: Prepare project monitoring map",
                )}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              {c("المشروع أو نطاق العمل", "Project or workstream")}
              <input
                value={draft.projectName}
                onChange={(event) =>
                  setDraft({ ...draft, projectName: event.target.value })
                }
                placeholder={c(
                  "مثال: مشروع المراقبة الزراعية",
                  "Example: Agricultural monitoring project",
                )}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              {c("الوصف ومعيار القبول", "Description and acceptance criteria")}
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                placeholder={c(
                  "ما المطلوب؟ وما الشكل الذي يُعتبر إنجازاً مقبولاً؟",
                  "What is required and what counts as an acceptable outcome?",
                )}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              {c(
                "خطوات التنفيذ (خطوة في كل سطر)",
                "Checklist steps (one per line)",
              )}
              <textarea
                value={draft.subtasks}
                onChange={(event) =>
                  setDraft({ ...draft, subtasks: event.target.value })
                }
                placeholder={c(
                  "جمع البيانات\nمراجعة الجودة\nتسليم المخرجات",
                  "Collect data\nQuality review\nDeliver outputs",
                )}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                {c("الموظف المكلّف", "Assignee")}
                <select
                  required
                  value={draft.assigneeId}
                  onChange={(event) =>
                    setDraft({ ...draft, assigneeId: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal"
                >
                  <option value="">
                    {c("اختر موظفاً", "Choose employee")}
                  </option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {c(user.nameAr, user.nameEn)} —{" "}
                      {c(user.jobTitleAr, user.jobTitleEn)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                {c("الأولوية", "Priority")}
                <select
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      priority: event.target.value as TaskPriority,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal"
                >
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {c(priorityMeta[item].ar, priorityMeta[item].en)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                {c("تاريخ الاستحقاق", "Due date")}
                <input
                  type="date"
                  required
                  min={companyToday}
                  value={draft.dueDate}
                  onChange={(event) =>
                    setDraft({ ...draft, dueDate: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal"
                />
              </label>
              <label className="text-xs font-bold">
                {c("الساعات المقدرة", "Estimated hours")}
                <input
                  type="number"
                  min="1"
                  value={draft.estimatedHours}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      estimatedHours: Number(event.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal"
                />
              </label>
            </div>
            <section className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-3">
              <label className="block cursor-pointer text-xs font-bold text-slate-800">
                {c("مرفقات صغيرة (اختياري)", "Small attachments (optional)")}
                <input
                  type="file"
                  multiple
                  accept={TASK_ATTACHMENT_ACCEPT}
                  onChange={(event) =>
                    selectAttachmentFiles(event.target.files, true)
                  }
                  className="mt-2 block w-full text-xs file:me-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                />
              </label>
              <p className="mt-2 text-[10px] text-slate-500">
                {c(
                  "صور أو Word أو PowerPoint أو Excel فقط، بحد أقصى 5 م.ب لكل ملف و5 ملفات للمهمة.",
                  "Images, Word, PowerPoint, or Excel only — up to 5 MB each and 5 files per task.",
                )}
              </p>
              {createFiles.length > 0 && (
                <ul className="mt-2 space-y-1 text-[11px] text-slate-700">
                  {createFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1"
                    >
                      <span className="truncate">
                        {file.name} · {formatTaskAttachmentSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCreateFiles((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="text-rose-600"
                      >
                        {c("إزالة", "Remove")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                {c("إلغاء", "Cancel")}
              </button>
              <button
                disabled={working}
                type="submit"
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {working && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {c("إنشاء وإرسال المهمة", "Create and send task")}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }
};
