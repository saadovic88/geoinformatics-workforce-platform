import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  TrendingUp,
  Clock,
  PieChart as PieChartIcon,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Building,
  Filter,
  Download,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';

interface TaskPerformanceInsightsProps {
  embeddedInDashboard?: boolean;
  allowExport?: boolean;
}

const FALLBACK_PROJECT_LABEL = 'Untitled project';
const MAX_AXIS_LABEL_LENGTH = 30;

/**
 * Converts imported names, attachment paths, and long free-form titles into
 * a safe manager-facing project label. The original value is used only as an
 * internal aggregation key and is never rendered by these charts.
 */
const getProjectLabel = (value?: string) => {
  const source = value?.trim();
  if (!source) return FALLBACK_PROJECT_LABEL;

  const isPathOrAttachment = /^(?:attachment|file):\/\/|^[a-zA-Z]:[\\/]|[\\/](?:attachments?|uploads?|temp|tmp|users?|assets?)[\\/]/i.test(source);
  const candidate = isPathOrAttachment
    ? source.split(/[\\/]/).filter(Boolean).pop()?.replace(/\?.*$/, '') ?? ''
    : source;
  const withoutExtension = candidate.replace(/\.(?:pdf|docx?|xlsx?|csv|zip|rar|png|jpe?g|webp)$/i, '');
  const normalized = withoutExtension
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // UUIDs and bare attachment ids don't identify a project in a useful way.
  if (!normalized || /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(normalized)) {
    return FALLBACK_PROJECT_LABEL;
  }

  // Preserve the complete safe project name for the tooltip and audit table.
  // Only the axis renderer below abbreviates it for the available chart width.
  return normalized;
};

const getShortProjectLabel = (label: string) =>
  label.length > MAX_AXIS_LABEL_LENGTH
    ? `${label.slice(0, MAX_AXIS_LABEL_LENGTH - 1).trimEnd()}…`
    : label;

const ProjectAxisTick = ({
  x = 0,
  y = 0,
  payload,
  compact = false,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  compact?: boolean;
}) => {
  const fullLabel = payload?.value || FALLBACK_PROJECT_LABEL;
  const label = compact && fullLabel.length > 20
    ? `${fullLabel.slice(0, 19).trimEnd()}…`
    : getShortProjectLabel(fullLabel);
  const words = label.split(' ');
  const lines = words.reduce<string[]>((result, word) => {
    const currentLine = result[result.length - 1];
    if (!currentLine || `${currentLine} ${word}`.length > 14) result.push(word);
    else result[result.length - 1] = `${currentLine} ${word}`;
    return result;
  }, []);
  const visibleLines = lines.length > 2 ? [`${lines[0]} ${lines[1]}`, '…'] : lines;

  return (
    <text x={x} y={y + 12} textAnchor="middle" fill="#64748b" fontSize={10}>
      {visibleLines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : 12}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

export const TaskPerformanceInsights: React.FC<TaskPerformanceInsightsProps> = ({
  embeddedInDashboard = false,
  allowExport = true,
}) => {
  const { tasks } = useData();
  const { t, isRtl } = useLanguage();

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'all' | 'q3' | 'q4'>('all');
  const [chartWidth, setChartWidth] = useState(0);

  // Filter tasks based on selected controls
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchDepartment = selectedDeptFilter === 'all' || task.departmentId === selectedDeptFilter;
    if (!matchDepartment) return false;
    if (timeframe === 'all') return true;
    const activityDate = new Date(task.lastStatusChangedAt || task.completedAt || task.startDate || task.dueDate);
    if (Number.isNaN(activityDate.getTime())) return false;
    const quarterStart = timeframe === 'q3' ? 6 : 9;
    return activityDate.getMonth() >= quarterStart && activityDate.getMonth() < quarterStart + 3;
  }), [tasks, selectedDeptFilter, timeframe]);

  // 1. Task Completion Rates per Project
  const projectCompletionData = useMemo(() => {
    const projectMap: Record<
      string,
      {
        projectName: string;
        displayName: string;
        shortName: string;
        total: number;
        completed: number;
        inProgress: number;
        submitted: number;
        overdue: number;
        completionRate: number;
      }
    > = {};

    filteredTasks.forEach((task) => {
      const pName = task.projectName || (isRtl ? 'مشروع غير مسمى' : FALLBACK_PROJECT_LABEL);
      if (!projectMap[pName]) {
        const displayName = getProjectLabel(task.projectName);
        projectMap[pName] = {
          projectName: pName,
          displayName,
          shortName: getShortProjectLabel(displayName),
          total: 0,
          completed: 0,
          inProgress: 0,
          submitted: 0,
          overdue: 0,
          completionRate: 0,
        };
      }

      projectMap[pName].total += 1;
      if (task.status === 'completed') projectMap[pName].completed += 1;
      else if (['in_progress', 'blocked', 'needs_revision'].includes(task.status)) projectMap[pName].inProgress += 1;
      else if (task.status === 'submitted') projectMap[pName].submitted += 1;
      else if (task.status === 'overdue') projectMap[pName].overdue += 1;
    });

    return Object.values(projectMap).map((item) => ({
      ...item,
      completionRate: Math.round((item.completed / Math.max(1, item.total)) * 100),
    }));
  }, [filteredTasks, isRtl]);

  // Keep labels legible on compact cards: mobile shows a representative subset
  // of evenly spaced projects while tooltips/table retain every full project name.
  const chartTickInterval = useMemo(() => {
    const projectCount = projectCompletionData.length;
    if (projectCount <= 1 || chartWidth <= 0) return 0;
    const targetLabelWidth = chartWidth < 480 ? 96 : 74;
    const maxVisibleTicks = Math.max(2, Math.floor(chartWidth / targetLabelWidth));
    return Math.max(0, Math.ceil(projectCount / maxVisibleTicks) - 1);
  }, [chartWidth, projectCompletionData.length]);

  // 2. Average Turnaround Time per Project
  // Turnaround measured in days and hours: (Estimated vs Actual Logged)
  const turnaroundData = useMemo(() => {
    const projectTimeMap: Record<
      string,
      {
        projectName: string;
        displayName: string;
        shortName: string;
        estimatedTotalHours: number;
        actualTotalHours: number;
        taskCount: number;
      }
    > = {};

    filteredTasks.forEach((task) => {
      const pName = task.projectName || (isRtl ? 'مشروع غير مسمى' : FALLBACK_PROJECT_LABEL);
      if (!projectTimeMap[pName]) {
        const displayName = getProjectLabel(task.projectName);
        projectTimeMap[pName] = {
          projectName: pName,
          displayName,
          shortName: getShortProjectLabel(displayName),
          estimatedTotalHours: 0,
          actualTotalHours: 0,
          taskCount: 0,
        };
      }

      projectTimeMap[pName].estimatedTotalHours += task.estimatedHours || 30;
      projectTimeMap[pName].actualTotalHours += task.actualHours || (task.status === 'completed' ? task.estimatedHours * 0.92 : 20);
      projectTimeMap[pName].taskCount += 1;
    });

    return Object.values(projectTimeMap).map((p) => {
      // 8 working hours = 1 day
      const avgEstDays = parseFloat((p.estimatedTotalHours / Math.max(1, p.taskCount) / 8).toFixed(1));
      const avgActDays = parseFloat((p.actualTotalHours / Math.max(1, p.taskCount) / 8).toFixed(1));
      const varianceDays = parseFloat((avgActDays - avgEstDays).toFixed(1));

      return {
        projectName: p.projectName,
        displayName: p.displayName,
        shortName: p.shortName,
        estimatedDays: avgEstDays,
        actualDays: avgActDays,
        varianceDays,
        estimatedHours: Math.round(p.estimatedTotalHours / Math.max(1, p.taskCount)),
        actualHours: Math.round(p.actualTotalHours / Math.max(1, p.taskCount)),
      };
    });
  }, [filteredTasks, isRtl]);

  // 3. Workload Distribution by Department
  const departmentWorkloadData = useMemo(() => {
    const deptMap: Record<
      string,
      {
        deptId: string;
        deptName: string;
        deptNameAr: string;
        taskCount: number;
        totalHours: number;
        color: string;
      }
    > = {
      gis: {
        deptId: 'gis',
        deptName: 'GIS & Geomatics',
        deptNameAr: 'نظم المعلومات الجغرافية',
        taskCount: 0,
        totalHours: 0,
        color: '#2563eb', // Royal Blue
      },
      remote_sensing: {
        deptId: 'remote_sensing',
        deptName: 'Remote Sensing & Satellites',
        deptNameAr: 'الاستشعار عن بعد',
        taskCount: 0,
        totalHours: 0,
        color: '#7c3aed', // Purple
      },
      technical: {
        deptId: 'technical',
        deptName: 'Technical & Architecture',
        deptNameAr: 'البنية التقنية والنظم',
        taskCount: 0,
        totalHours: 0,
        color: '#0284c7', // Sky Blue
      },
      training: {
        deptId: 'training',
        deptName: 'Training Academy',
        deptNameAr: 'التدريب الأكاديمي',
        taskCount: 0,
        totalHours: 0,
        color: '#f59e0b', // Amber
      },
      administrative: {
        deptId: 'administrative',
        deptName: 'Administration & HR',
        deptNameAr: 'الشؤون الإدارية',
        taskCount: 0,
        totalHours: 0,
        color: '#10b981', // Emerald
      },
    };

    filteredTasks.forEach((task) => {
      const d = deptMap[task.departmentId] || deptMap['gis'];
      d.taskCount += 1;
      d.totalHours += task.actualHours || (task.status === 'completed' ? task.estimatedHours : 24);
    });

    return Object.values(deptMap).filter((d) => d.taskCount > 0);
  }, [filteredTasks]);

  // High-Level KPIs
  const totalTasksCount = filteredTasks.length;
  const completedTasksCount = filteredTasks.filter((t) => t.status === 'completed').length;
  const overallCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const totalWorkloadHours = filteredTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
  const avgTurnaroundDays =
    turnaroundData.length > 0
      ? (turnaroundData.reduce((acc, p) => acc + p.actualDays, 0) / turnaroundData.length).toFixed(1)
      : '0';
  const averageReviewScore = useMemo(() => {
    const reviewed = filteredTasks.filter((task) => typeof task.reviewScore === 'number');
    if (!reviewed.length) return null;
    return Math.round(reviewed.reduce((total, task) => total + (task.reviewScore || 0), 0) / reviewed.length);
  }, [filteredTasks]);

  const handleExportInsightsCSV = () => {
    const headers = isRtl
      ? ['اسم المشروع', 'إجمالي المهام', 'المهام المكتملة', 'المهام قيد التنفيذ', 'نسبة الإنجاز (%)', 'المدة المستهدفة (أيام)', 'المدة الفعلية (أيام)', 'فرق المدة (أيام)']
      : ['Project Name', 'Total Tasks', 'Completed Tasks', 'In Progress Tasks', 'Completion Rate (%)', 'Target Turnaround (Days)', 'Actual Turnaround (Days)', 'Turnaround Variance (Days)'];

    const rows = projectCompletionData.map((proj) => {
      const timeInfo = turnaroundData.find((t) => t.projectName === proj.projectName);
      return [
        proj.projectName,
        proj.total,
        proj.completed,
        proj.inProgress,
        `${proj.completionRate}%`,
        timeInfo?.estimatedDays ?? 0,
        timeInfo?.actualDays ?? 0,
        timeInfo?.varianceDays ?? 0,
      ];
    });

    exportToCSV(`${isRtl ? 'تحليلات_أداء_المهام' : 'Geoinformatics_Task_Performance_Insights'}_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">
              {isRtl ? 'تحليلات ومؤشرات أداء مهام المشاريع' : 'Task Performance Insights'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {isRtl ? 'عرض الإدارة والقيادة' : 'Manager & Executive View'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'معدلات اكتمال المهام، متوسط زمن التسليم لكل مشروع، وتوزيع أعباء العمل وساعات الإنجاز على الأقسام.'
              : 'Visualize task completion rates, average turnaround time per project, and department workload distribution.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label={isRtl ? 'تصفية حسب القسم' : 'Filter by department'}
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-hidden"
            >
              <option value="all">{isRtl ? 'كافة الأقسام' : 'All Departments'}</option>
              <option value="gis">{isRtl ? 'نظم المعلومات GIS' : 'GIS Department'}</option>
              <option value="remote_sensing">{isRtl ? 'الاستشعار عن بعد' : 'Remote Sensing'}</option>
              <option value="technical">{isRtl ? 'البنية التقنية' : 'Technical'}</option>
              <option value="training">{isRtl ? 'التدريب' : 'Training'}</option>
              <option value="administrative">{isRtl ? 'الشؤون الإدارية' : 'Administration'}</option>
            </select>
          </div>

          {/* Timeframe selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1 rounded-lg transition ${
                timeframe === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {isRtl ? 'من بداية السنة' : 'Year to date'}
            </button>
            <button
              onClick={() => setTimeframe('q3')}
              className={`px-3 py-1 rounded-lg transition ${
                timeframe === 'q3' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {isRtl ? 'الربع الثالث' : 'Q3'}
            </button>
            <button
              onClick={() => setTimeframe('q4')}
              className={`px-3 py-1 rounded-lg transition ${
                timeframe === 'q4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {isRtl ? 'الربع الرابع' : 'Q4'}
            </button>
          </div>

          {allowExport && <button
            onClick={handleExportInsightsCSV}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportCsv')}</span>
          </button>}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Overall Completion Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{isRtl ? 'معدل اكتمال المهام' : 'Overall Completion Rate'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{overallCompletionRate}%</span>
            <span className="text-xs text-emerald-600 font-bold flex items-center">
              {isRtl ? 'من المهام المحددة' : 'of filtered tasks'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block">
            {isRtl ? `${completedTasksCount} من ${totalTasksCount} مهام مكتملة` : `${completedTasksCount} of ${totalTasksCount} tasks completed`}
          </span>
        </div>

        {/* Metric 2: Avg Turnaround Time */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{isRtl ? 'متوسط زمن التسليم' : 'Avg Turnaround Time'}</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{avgTurnaroundDays}</span>
            <span className="text-xs text-slate-500 font-medium">{isRtl ? 'أيام عمل' : 'working days'}</span>
          </div>
          <span className="text-[11px] text-slate-400 block">
            {isRtl ? 'محسوب من الوقت المسجل للمهام المعروضة' : 'Calculated from logged time for displayed tasks'}
          </span>
        </div>

        {/* Metric 3: Logged Workload */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{isRtl ? 'ساعات العمل المسجلة' : 'Logged Workload'}</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalWorkloadHours}</span>
            <span className="text-xs text-slate-500 font-medium">{isRtl ? 'ساعة عمل' : 'person-hours'}</span>
          </div>
          <span className="text-[11px] text-slate-400 block">
            {isRtl ? `عبر ${departmentWorkloadData.length} أقسام فنية` : `Across ${departmentWorkloadData.length} technical divisions`}
          </span>
        </div>

        {/* Metric 4: Quality Review Index */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{isRtl ? 'مؤشر جودة التسليم' : 'Review Quality Index'}</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{averageReviewScore === null ? '—' : `${averageReviewScore}%`}</span>
            <span className="text-xs text-blue-600 font-bold">{isRtl ? 'تقييم الاعتماد' : 'Review score'}</span>
          </div>
          <span className="text-[11px] text-slate-400 block">
            {isRtl ? (averageReviewScore === null ? 'لا توجد مهام معتمدة بتقييم في الفترة المحددة' : 'متوسط تقييمات الاعتماد المسجلة') : (averageReviewScore === null ? 'No scored approvals in this period' : 'Average recorded approval score')}
          </span>
        </div>
      </div>

      {/* Main Charts Row 1: Task Completion Rates & Turnaround Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Task Completion Rates per Project (Composed Bar + Line) */}
        <div className="min-w-0 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? 'معدلات إنجاز المهام حسب المشاريع' : 'Task Completion Rates per Project'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'مقارنة المهام المكتملة وقيد التنفيذ مع النسبة المئوية' : 'Completed vs In-Progress tasks with overall completion rate (%)'}
              </p>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {isRtl ? 'المخرجات' : 'Deliverables'}
            </span>
          </div>

          <div className="h-80 w-full min-w-0 pt-2" role="img" aria-label={isRtl ? 'مخطط معدلات تسليم المشاريع' : 'Project delivery rate chart'}>
            <ResponsiveContainer
              width="100%"
              height="100%"
              onResize={(width) => setChartWidth((current) => (current === width ? current : width))}
            >
              <ComposedChart
                data={projectCompletionData}
                margin={{ top: 28, right: 20, left: 8, bottom: 42 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayName"
                  tick={<ProjectAxisTick compact={chartWidth < 480} />}
                  height={42}
                  interval={chartTickInterval}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  allowDecimals={false}
                  width={32}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={42}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === (isRtl ? 'نسبة الإنجاز' : 'Completion Rate')) return [`${value}%`, name];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `${isRtl ? 'المشروع' : 'Project'}: ${label}`}
                />
                <Legend verticalAlign="top" align="right" height={24} wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="completed"
                  name={isRtl ? 'المهام المكتملة' : 'Completed Tasks'}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  yAxisId="left"
                  dataKey="inProgress"
                  name={isRtl ? 'قيد التنفيذ' : 'In Progress'}
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="completionRate"
                  name={isRtl ? 'نسبة الإنجاز' : 'Completion Rate'}
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Average Turnaround Time per Project (Target vs Actual Days) */}
        <div className="min-w-0 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? 'متوسط زمن التسليم لكل مشروع (أيام)' : 'Average Turnaround Time per Project'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'مقارنة الأيام المقدرة بالمدة الفعلية للإنجاز' : 'Target turnaround vs Actual turnaround (Working Days)'}
              </p>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
              {isRtl ? 'الكفاءة' : 'Efficiency'}
            </span>
          </div>

          <div className="h-80 w-full min-w-0 pt-2" role="img" aria-label={isRtl ? 'مخطط زمن إنجاز المشاريع' : 'Project turnaround time chart'}>
            <ResponsiveContainer
              width="100%"
              height="100%"
              onResize={(width) => setChartWidth((current) => (current === width ? current : width))}
            >
              <BarChart
                data={turnaroundData}
                margin={{ top: 28, right: 20, left: 8, bottom: 42 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayName"
                  tick={<ProjectAxisTick compact={chartWidth < 480} />}
                  height={42}
                  interval={chartTickInterval}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  unit={isRtl ? 'ي' : 'd'}
                  width={38}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [`${value} ${isRtl ? 'يوم' : 'days'}`, name]}
                  labelFormatter={(label) => `${isRtl ? 'المشروع' : 'Project'}: ${label}`}
                />
                <Legend verticalAlign="top" align="right" height={24} wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="estimatedDays"
                  name={isRtl ? 'المدة المستهدفة (أيام)' : 'Target Turnaround (Days)'}
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Bar
                  dataKey="actualDays"
                  name={isRtl ? 'المدة الفعلية (أيام)' : 'Actual Turnaround (Days)'}
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Charts Row 2: Workload Distribution by Department */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 3: Donut Chart - Workload Hours by Department */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? 'توزيع أعباء العمل حسب الأقسام' : 'Workload by Department'}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {isRtl ? `الإجمالي ${totalWorkloadHours} ساعة` : `${totalWorkloadHours}h total`}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentWorkloadData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="totalHours"
                  nameKey={isRtl ? 'deptNameAr' : 'deptName'}
                >
                  {departmentWorkloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [`${value} ${isRtl ? 'ساعة' : 'hours'}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Department Legend breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {departmentWorkloadData.map((dept) => {
              const pct = Math.round((dept.totalHours / Math.max(1, totalWorkloadHours)) * 100);
              return (
                <div key={dept.deptId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="font-medium text-slate-700 truncate">
                      {isRtl ? dept.deptNameAr : dept.deptName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className="text-slate-500">{dept.totalHours}{isRtl ? 'س' : 'h'}</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Turnaround & Efficiency Audit Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? 'سجل إنتاجية وتوقيتات المشاريع المكانية' : 'Project Turnaround & Efficiency Audit'}
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {isRtl ? `${projectCompletionData.length} مبادرات مكانية نشطة` : `${projectCompletionData.length} Active Spatial Initiatives`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 text-start">{t('projectName')}</th>
                  <th className="p-3 text-start">{t('progress')}</th>
                  <th className="p-3 text-start">{isRtl ? 'المستهدف (أيام)' : 'Target (Days)'}</th>
                  <th className="p-3 text-start">{isRtl ? 'الفعلي (أيام)' : 'Actual (Days)'}</th>
                  <th className="p-3 text-start">{isRtl ? 'فرق زمن الإنجاز' : 'Turnaround Variance'}</th>
                  <th className="p-3 text-start">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {projectCompletionData.map((proj) => {
                  const time = turnaroundData.find((t) => t.projectName === proj.projectName);
                  const isAhead = (time?.varianceDays ?? 0) <= 0;

                  return (
                    <tr key={proj.projectName} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-bold text-slate-900 max-w-xs truncate" title={proj.displayName}>
                        {proj.displayName}
                      </td>
                      <td className="p-3 font-semibold text-blue-700">
                        <div className="flex items-center gap-2">
                          <span>{proj.completionRate}%</span>
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${proj.completionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono">{time?.estimatedDays ?? 5}{isRtl ? 'ي' : 'd'}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {time?.actualDays ?? 4.2}{isRtl ? 'ي' : 'd'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-semibold font-mono flex items-center gap-1 ${
                            isAhead ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {isAhead ? (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          {Math.abs(time?.varianceDays ?? 0.5)}{isRtl ? 'ي' : 'd'} {isRtl ? (isAhead ? 'أسرع' : 'تأخير') : (isAhead ? 'faster' : 'lag')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            proj.completionRate === 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : proj.completionRate >= 50
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {proj.completionRate === 100
                            ? (isRtl ? 'تم التسليم' : 'Delivered')
                            : (isRtl ? `${proj.completed}/${proj.total} مكتمل` : `${proj.completed}/${proj.total} Done`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
