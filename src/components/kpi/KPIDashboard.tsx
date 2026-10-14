import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { MonthlyKPIRecord } from '../../types';
import {
  Award,
  TrendingUp,
  Clock,
  CheckSquare,
  HeartHandshake,
  GraduationCap,
  Download,
  Filter,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  Database,
  FileDown,
} from 'lucide-react';
import { exportToCSV, triggerPrintReport } from '../../utils/exportUtils';
import { DepartmentKPITrendsVisualizer } from './DepartmentKPITrendsVisualizer';
import { UserAvatar } from '../common/UserAvatar';
import { QuarterlyReviewExportModal } from './QuarterlyReviewExportModal';
import { QuarterlyRawDataExportModal } from './QuarterlyRawDataExportModal';
import { QuarterlyTeamTrendChart } from './QuarterlyTeamTrendChart';
import { exportRawQuarterlyPerformanceCSV } from '../../utils/kpiQuarterlyExport';

interface KPIDashboardProps {
  initialMode?: 'my' | 'team' | 'reports';
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({ initialMode = 'my' }) => {
  const { currentUser, users, isFullAccessUser } = useAuth();
  const { kpiRecords, updateKPIRecord, attendanceRecords, tasks } = useData();
  const { t, isRtl } = useLanguage();

  const [mode, setMode] = useState<'my' | 'team' | 'reports'>(isFullAccessUser ? initialMode : 'my');
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentUser.id);
  const [isQuarterlyModalOpen, setIsQuarterlyModalOpen] = useState(false);
  const [isRawDataModalOpen, setIsRawDataModalOpen] = useState(false);

  // Scoring form state for managers
  const [scoringUser, setScoringUser] = useState<string>(users[8]?.id || 'emp_ahmed_salah');
  const [attScore, setAttScore] = useState<number>(18.5);
  const [workScore, setWorkScore] = useState<number>(37.0);
  const [behScore, setBehScore] = useState<number>(19.0);
  const [devScore, setDevScore] = useState<number>(18.0);
  const [managerNotes, setManagerNotes] = useState<string>('Strong performance in raster GIS inferencing.');
  const [evalSuccess, setEvalSuccess] = useState(false);

  // KPI is intentionally a multi-review process. The three named company
  // leaders submit independent reviews; none of them overwrites another.
  const kpiEvaluators = users.filter((user) =>
    ['m.badawy@geoinformatics.com', 'amr.soghayar@geoinformatics.com', 'badr.salama@geoinformatics.com']
      .includes(user.email.toLowerCase())
  );

  const months = [
    { num: 1, name: isRtl ? 'يناير' : 'January' },
    { num: 2, name: isRtl ? 'فبراير' : 'February' },
    { num: 3, name: isRtl ? 'مارس' : 'March' },
    { num: 4, name: isRtl ? 'أبريل' : 'April' },
    { num: 5, name: isRtl ? 'مايو' : 'May' },
    { num: 6, name: isRtl ? 'يونيو' : 'June' },
    { num: 7, name: isRtl ? 'يوليو' : 'July' },
    { num: 8, name: isRtl ? 'أغسطس' : 'August' },
    { num: 9, name: isRtl ? 'سبتمبر' : 'September' },
    { num: 10, name: isRtl ? 'أكتوبر' : 'October' },
    { num: 11, name: isRtl ? 'نوفمبر' : 'November' },
    { num: 12, name: isRtl ? 'ديسمبر' : 'December' },
  ];

  const selectedMonthReviews = kpiRecords.filter(
    (record) => record.employeeId === selectedEmployeeId && record.month === selectedMonth && record.year === 2026
  );
  const ownReview = selectedMonthReviews.find((record) => record.evaluatorId === currentUser.id);
  // The detail page prioritizes the viewer's own review, then falls back to a
  // historical review. The scorecard below makes every leader's status explicit.
  const activeKPI = ownReview || selectedMonthReviews[0] ||
    kpiRecords.find((k) => k.employeeId === selectedEmployeeId) || kpiRecords[0];
  const averageReviewScore = selectedMonthReviews.length
    ? Number((selectedMonthReviews.reduce((sum, record) => sum + record.totalScore, 0) / selectedMonthReviews.length).toFixed(1))
    : undefined;

  const targetEmployee = users.find((u) => u.id === selectedEmployeeId) || currentUser;
  const scoringEmployee = users.find((user) => user.id === scoringUser) || currentUser;
  const scoringMonthReviews = kpiRecords.filter(
    (record) => record.employeeId === scoringUser && record.year === 2026 && record.month === selectedMonth
  );

  useEffect(() => {
    if (!isFullAccessUser) return;
    const existingReview = kpiRecords.find(
      (record) => record.employeeId === scoringUser && record.year === 2026 && record.month === selectedMonth && record.evaluatorId === currentUser.id
    );
    if (existingReview) {
      setAttScore(existingReview.attendanceScore.scoreOutOfWeight);
      setWorkScore(existingReview.workScore.scoreOutOfWeight);
      setBehScore(existingReview.behaviorScore.scoreOutOfWeight);
      setDevScore(existingReview.selfDevScore.scoreOutOfWeight);
      setManagerNotes(existingReview.workScore.managerNotes || '');
      return;
    }
    setAttScore(18.5);
    setWorkScore(37);
    setBehScore(18);
    setDevScore(18);
    setManagerNotes('');
  }, [currentUser.id, isFullAccessUser, kpiRecords, scoringUser, selectedMonth]);

  // Annual calculation: average of 12 months
  // For demo, generate a realistic 12-month curve
  const simulated12Months = [
    { month: 1, name: isRtl ? 'يناير' : 'Jan', score: 91.2 },
    { month: 2, name: isRtl ? 'فبراير' : 'Feb', score: 92.5 },
    { month: 3, name: isRtl ? 'مارس' : 'Mar', score: 90.8 },
    { month: 4, name: isRtl ? 'أبريل' : 'Apr', score: 93.1 },
    { month: 5, name: isRtl ? 'مايو' : 'May', score: 94.0 },
    { month: 6, name: isRtl ? 'يونيو' : 'Jun', score: 92.8 },
    { month: 7, name: isRtl ? 'يوليو' : 'Jul', score: 95.2 },
    { month: 8, name: isRtl ? 'أغسطس' : 'Aug', score: 93.9 },
    { month: 9, name: isRtl ? 'سبتمبر' : 'Sep', score: activeKPI ? activeKPI.totalScore : 94.5 },
    { month: 10, name: isRtl ? 'أكتوبر' : 'Oct', score: 94.0 },
    { month: 11, name: isRtl ? 'نوفمبر' : 'Nov', score: 95.0 },
    { month: 12, name: isRtl ? 'ديسمبر' : 'Dec', score: 95.5 },
  ];

  const annualAvg = parseFloat(
    (simulated12Months.reduce((acc, m) => acc + m.score, 0) / 12).toFixed(1)
  );

  const handleSaveEvaluation = () => {
    if (!isFullAccessUser) return;
    const total = parseFloat((attScore + workScore + behScore + devScore).toFixed(1));
    const newRecord: MonthlyKPIRecord = {
      id: `kpi_${scoringUser}_2026_${selectedMonth}_${currentUser.id}`,
      employeeId: scoringUser,
      year: 2026,
      month: selectedMonth,
      attendanceScore: {
        category: 'attendance',
        weight: 20,
        scoreOutOfWeight: attScore,
        scorePercentage: (attScore / 20) * 100,
        managerNotes,
        metrics: { attendanceRate: '98%', lateMinutes: 15 },
      },
      workScore: {
        category: 'work_performance',
        weight: 40,
        scoreOutOfWeight: workScore,
        scorePercentage: (workScore / 40) * 100,
        managerNotes,
        metrics: { tasksDelivered: 5, accuracy: '95%' },
      },
      behaviorScore: {
        category: 'behavior',
        weight: 20,
        scoreOutOfWeight: behScore,
        scorePercentage: (behScore / 20) * 100,
        managerNotes,
        metrics: { teamwork: '5/5' },
      },
      selfDevScore: {
        category: 'self_development',
        weight: 20,
        scoreOutOfWeight: devScore,
        scorePercentage: (devScore / 20) * 100,
        managerNotes,
        metrics: { trainings: 1 },
      },
      totalScore: total,
      status: 'published',
      reviewedBy: currentUser.nameEn,
      evaluatorId: currentUser.id,
      publishedAt: new Date().toISOString(),
      evidenceLinks: [],
    };
    updateKPIRecord(newRecord);
    setEvalSuccess(true);
    setTimeout(() => setEvalSuccess(false), 3000);
  };

  const handleExportKPIReport = () => {
    const headers = ['Code', 'Employee', 'Attendance (20%)', 'Work (40%)', 'Behavior (20%)', 'Self-Dev (20%)', 'Total (100%)'];
    const rows = users.map((u) => {
      const k = kpiRecords.find((rec) => rec.employeeId === u.id);
      return [
        u.employeeCode,
        isRtl ? u.nameAr : u.nameEn,
        k ? `${k.attendanceScore.scoreOutOfWeight}/20` : '18/20',
        k ? `${k.workScore.scoreOutOfWeight}/40` : '36/40',
        k ? `${k.behaviorScore.scoreOutOfWeight}/20` : '19/20',
        k ? `${k.selfDevScore.scoreOutOfWeight}/20` : '18/20',
        k ? `${k.totalScore}%` : '91%',
      ];
    });
    exportToCSV(`Geoinformatics_KPI_Summary_Month_${selectedMonth}_2026`, headers, rows);
  };

  const isManager = isFullAccessUser;
  const canViewCompanyReporting = isFullAccessUser;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900">{t('kpiTitle')}</h1>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              100% Standardized Model
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {t('kpiWeightNote')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('my');
                setSelectedEmployeeId(currentUser.id);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                mode === 'my' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('navMyKPI')}
            </button>
            {isManager && (
              <button
                onClick={() => setMode('team')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  mode === 'team' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('navTeamKPI')}
              </button>
            )}
            {canViewCompanyReporting && <button
              onClick={() => setMode('reports')}
              className={`px-3 py-1.5 rounded-lg transition ${
                mode === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('navKPIReports')}
            </button>}
          </div>

          {isFullAccessUser && <button
            onClick={() => setIsRawDataModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition flex items-center gap-1.5"
            title={isRtl ? 'تصدير بيانات الأداء الخام للتحليل الربع سنوي' : 'Export Raw Performance Data for Quarterly Review Analysis'}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isRtl ? 'بيانات الأداء الخام (CSV)' : 'Raw Quarterly Data (CSV)'}</span>
          </button>}

          {isFullAccessUser && <button
            onClick={() => setIsQuarterlyModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isRtl ? 'تقرير الربع (PDF / CSV)' : 'Quarterly Report (PDF / CSV)'}</span>
          </button>}

          {isFullAccessUser && <button
            onClick={handleExportKPIReport}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center gap-1.5"
            title={t('exportCsv')}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('exportCsv')}</span>
          </button>}
        </div>
      </div>

      {/* 4-Pill Weight Breakdown Formula Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> {isRtl ? 'الالتزام بالحضور' : 'Attendance'}
            </span>
            <span className="font-black text-blue-700">{isRtl ? 'وزن 20%' : '20% Weight'}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isRtl ? 'الانضباط، السياج الجغرافي، وساعات العمل' : 'Punctuality, geofence, work hours'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> {isRtl ? 'إنجاز المهام' : 'Work Delivery'}
            </span>
            <span className="font-black text-emerald-700">{isRtl ? 'وزن 40%' : '40% Weight'}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isRtl ? 'تسليم مشاريع GIS بدقة وفي الموعد' : 'Completed GIS tasks, quality & deadline'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-purple-600" /> {isRtl ? 'السلوك المهني' : 'Behavior'}
            </span>
            <span className="font-black text-purple-700">{isRtl ? 'وزن 20%' : '20% Weight'}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isRtl ? 'الاحترافية، العمل الجماعي، والمسؤولية' : 'Professionalism, teamwork & commitment'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-amber-600" /> {isRtl ? 'التطوير الذاتي' : 'Self-Development'}
            </span>
            <span className="font-black text-amber-700">{isRtl ? 'وزن 20%' : '20% Weight'}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isRtl ? 'الشهادات والمهارات ونقل المعرفة' : 'Certificates, skills & knowledge sharing'}
          </p>
        </div>
      </div>

      {/* MODE 1: MY KPI / EMPLOYEE DETAIL VIEW */}
      {mode === 'my' && (
        <div className="space-y-6">
          {/* Main KPI Card */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-400/30">
                  {targetEmployee.employeeCode}
                </span>
                <span className="text-xs text-blue-200">
                  {isRtl ? targetEmployee.jobTitleAr : targetEmployee.jobTitleEn}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {isRtl ? targetEmployee.nameAr : targetEmployee.nameEn}
              </h2>
              <p className="text-xs text-slate-300">
                {isRtl ? 'فترة تقييم الأداء: ' : 'Performance Evaluation Period: '}<b>{isRtl ? 'سبتمبر 2026' : 'September 2026'}</b>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs text-center min-w-[120px]">
                <span className="text-xs text-blue-200 block mb-0.5">
                  {selectedMonthReviews.length > 1
                    ? (isRtl ? `متوسط ${selectedMonthReviews.length} تقييمات` : `${selectedMonthReviews.length}-review average`)
                    : t('monthlyKPIScore')}
                </span>
                <span className="text-3xl font-black text-white">{averageReviewScore ?? activeKPI?.totalScore ?? 94.5}%</span>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs text-center min-w-[120px]">
                <span className="text-xs text-amber-200 block mb-0.5">{t('annualKPIScore')}</span>
                <span className="text-3xl font-black text-amber-300">{annualAvg}%</span>
              </div>
            </div>
          </div>

          {/* 4 Weighted Categories Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category 1: Attendance 20% */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">{t('kpiCategoryAttendance')}</h3>
                </div>
                <span className="font-black text-blue-700 text-sm">
                  {activeKPI?.attendanceScore.scoreOutOfWeight ?? 18.5} / 20
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${((activeKPI?.attendanceScore.scoreOutOfWeight ?? 18.5) / 20) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <span>{isRtl ? 'أيام الحضور: ' : 'Present Days: '}<b>21</b></span>
                <span>{isRtl ? 'أيام الغياب: ' : 'Absence Days: '}<b>0</b></span>
                <span>{isRtl ? 'دقائق التأخير: ' : 'Late Minutes: '}<b>22 {isRtl ? 'دقيقة' : 'mins'}</b></span>
                <span>{isRtl ? 'الالتزام بالسياج: ' : 'Geofence Adherence: '}<b>98.5%</b></span>
              </div>
              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                "{activeKPI?.attendanceScore.managerNotes || 'Zero unexcused absences. Strong punctuality record.'}"
              </p>
            </div>

            {/* Category 2: Work Performance 40% */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-sm">{t('kpiCategoryWork')}</h3>
                </div>
                <span className="font-black text-emerald-700 text-sm">
                  {activeKPI?.workScore.scoreOutOfWeight ?? 37.0} / 40
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${((activeKPI?.workScore.scoreOutOfWeight ?? 37.0) / 40) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <span>{isRtl ? 'المهام المنجزة: ' : 'Completed Tasks: '}<b>4</b></span>
                <span>{isRtl ? 'نسبة الالتزام بالموعد: ' : 'On-Time Rate: '}<b>95%</b></span>
                <span>{isRtl ? 'تقييم الجودة: ' : 'Quality Score: '}<b>92 / 100</b></span>
                <span>{isRtl ? 'الفعالية الزمنية: ' : 'Actual vs Est: '}<b>{isRtl ? 'مثالية' : 'Optimal'}</b></span>
              </div>
              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                "{activeKPI?.workScore.managerNotes || 'High-precision spatial outputs, negligible rework.'}"
              </p>
            </div>

            {/* Category 3: Behavior 20% */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-slate-800 text-sm">{t('kpiCategoryBehavior')}</h3>
                </div>
                <span className="font-black text-purple-700 text-sm">
                  {activeKPI?.behaviorScore.scoreOutOfWeight ?? 19.0} / 20
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full"
                  style={{ width: `${((activeKPI?.behaviorScore.scoreOutOfWeight ?? 19.0) / 20) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <span>{isRtl ? 'العمل الجماعي: ' : 'Team Collaboration: '}<b>5 / 5</b></span>
                <span>{isRtl ? 'الالتزام بالسياسات: ' : 'Policy Compliance: '}<b>5 / 5</b></span>
                <span>{isRtl ? 'سرعة الاستجابة: ' : 'Responsiveness: '}<b>{isRtl ? 'ممتازة' : 'Excellent'}</b></span>
                <span>{isRtl ? 'مستوى الانتماء: ' : 'Commitment: '}<b>{isRtl ? 'عالي' : 'High'}</b></span>
              </div>
              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                "{activeKPI?.behaviorScore.managerNotes || 'Exemplary teamwork across GIS and Remote Sensing divisions.'}"
              </p>
            </div>

            {/* Category 4: Self-Development 20% */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-slate-800 text-sm">{t('kpiCategorySelfDev')}</h3>
                </div>
                <span className="font-black text-amber-700 text-sm">
                  {activeKPI?.selfDevScore.scoreOutOfWeight ?? 18.0} / 20
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-600 h-full rounded-full"
                  style={{ width: `${((activeKPI?.selfDevScore.scoreOutOfWeight ?? 18.0) / 20) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <span>{isRtl ? 'ساعات التدريب: ' : 'Learning Hours: '}<b>16 {isRtl ? 'ساعة' : 'hrs'}</b></span>
                <span>{isRtl ? 'الشهادات الفنية: ' : 'Certificates: '}<b>1</b></span>
                <span>{isRtl ? 'ورش العمل: ' : 'Workshops: '}<b>2</b></span>
                <span>{isRtl ? 'مستوى الكفاءة: ' : 'Skill Level: '}<b>{isRtl ? 'متقدم' : 'Advanced'}</b></span>
              </div>
              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                "{activeKPI?.selfDevScore.managerNotes || 'Completed Advanced Spatial Deep Learning credential.'}"
              </p>
            </div>
          </div>

          {/* 12-Month Performance Trend Chart */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">{t('annualTrend')} (2026)</h3>
              </div>
              <span className="text-xs font-bold text-blue-700">
                Annual Mean: {annualAvg}%
              </span>
            </div>

            {/* Simulated Clean SVG / Bar Chart for 12 months */}
            <div className="grid grid-cols-12 gap-2 items-end h-40 pt-4 px-2">
              {simulated12Months.map((m) => {
                const heightPercent = Math.max(10, ((m.score - 70) / 30) * 100);
                const isSelected = m.month === selectedMonth;

                return (
                  <div
                    key={m.month}
                    onClick={() => setSelectedMonth(m.month)}
                    className="flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group"
                  >
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-600 transition">
                      {m.score}%
                    </span>
                    <div className="w-full bg-slate-100 rounded-t-lg h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-lg transition duration-300 ${
                          isSelected ? 'bg-blue-600' : 'bg-blue-400/60 group-hover:bg-blue-500'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isSelected ? 'font-bold text-blue-700' : 'text-slate-400'
                      }`}
                    >
                      {m.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: TEAM KPI EVALUATION FOR MANAGERS */}
      {mode === 'team' && isManager && (
        <div className="space-y-6">
          {/* Quarterly Review Raw Performance Toolkit Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-5 border border-emerald-800/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">
                  {isRtl ? 'تحليل المراجعة الربع سنوية: تصدير بيانات الأداء الخام (CSV)' : 'Quarterly Review Analysis: Export Raw Team Performance Data (CSV)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/30">
                  Manager Toolkit
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                {isRtl
                  ? 'تصدير جدول البيانات الخام لمراجعة وتقييم أداء الفريق شاملاً درجات الأركان الشهرية الأربعة، ومعدل إنجاز المهام، وسجلات الحضور لدعم جلسات المراجعة الدورية.'
                  : 'Export unaggregated granular performance metrics across all quarterly months (Attendance, Work Output, Behavior, Self-Dev) for team calibration and review meetings.'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsRawDataModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
              >
                <FileDown className="w-4 h-4" />
                <span>{isRtl ? 'تصدير البيانات الخام (CSV)' : 'Export Raw CSV Data'}</span>
              </button>
            </div>
          </div>

          {/* Visual Trend Component: Aggregated Quarterly Line Chart for Team Comparison */}
          <QuarterlyTeamTrendChart
            onSelectEmployeeForEvaluation={(empId) => setScoringUser(empId)}
            defaultQuarter={selectedMonth <= 3 ? 'Q1' : selectedMonth <= 6 ? 'Q2' : selectedMonth <= 9 ? 'Q3' : 'Q4'}
          />

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">{t('evaluateEmployee')}</h2>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'نموذج التقييم الشهري للموظفين وفقاً للأوزان الأربعة القياسية (إجمالي 100%).'
                  : 'Monthly performance scoring interface for department managers.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Employee to Evaluate</label>
                <select
                  value={scoringUser}
                  onChange={(e) => setScoringUser(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nameEn} ({u.jobTitleEn}) - {u.employeeCode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Evaluation Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                >
                  {months.map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.name} 2026
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800">
                    {isRtl ? 'حالة التقييمات المستقلة' : 'Independent review status'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isRtl
                      ? `تقييمات ${isRtl ? scoringEmployee.nameAr : scoringEmployee.nameEn} للشهر المحدد؛ كل مسؤول يحفظ تقييمه منفصلاً.`
                      : `${scoringEmployee.nameEn}'s reviews for the selected month. Each leader saves an independent evaluation.`}
                  </p>
                </div>
                <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  {scoringMonthReviews.length}/3 {isRtl ? 'تقييمات منشورة' : 'reviews published'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {kpiEvaluators.map((evaluator) => {
                  const review = scoringMonthReviews.find((record) => record.evaluatorId === evaluator.id);
                  const isCurrentEvaluator = evaluator.id === currentUser.id;
                  return (
                    <div key={evaluator.id} className={`rounded-lg border p-2.5 ${isCurrentEvaluator ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center gap-2">
                        <UserAvatar src={evaluator.avatarUrl} name={isRtl ? evaluator.nameAr : evaluator.nameEn} size="xs" rounded="full" />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[11px] text-slate-800">{isRtl ? evaluator.nameAr : evaluator.nameEn}</p>
                          <p className={`text-[10px] font-semibold ${review ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {review ? `${review.totalScore}% · ${isRtl ? 'منشور' : 'Published'}` : (isRtl ? 'بانتظار التقييم' : 'Awaiting review')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {scoringMonthReviews.length > 0 && (
                <p className="text-[11px] text-slate-600">
                  {isRtl ? 'متوسط التقييمات المنشورة: ' : 'Published-review average: '}
                  <b>{Number((scoringMonthReviews.reduce((sum, record) => sum + record.totalScore, 0) / scoringMonthReviews.length).toFixed(1))}%</b>
                </p>
              )}
            </div>

            {/* 4 Score inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">1. Attendance (Max 20)</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={attScore}
                  onChange={(e) => setAttScore(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg bg-white border border-blue-300 font-bold text-sm"
                />
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">2. Work Performance (Max 40)</span>
                <input
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  value={workScore}
                  onChange={(e) => setWorkScore(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg bg-white border border-emerald-300 font-bold text-sm"
                />
              </div>

              <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">3. Behavior & Policy (Max 20)</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={behScore}
                  onChange={(e) => setBehScore(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg bg-white border border-purple-300 font-bold text-sm"
                />
              </div>

              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">4. Self-Development (Max 20)</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={devScore}
                  onChange={(e) => setDevScore(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg bg-white border border-amber-300 font-bold text-sm"
                />
              </div>
            </div>

            {/* Calculated Total */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Computed Monthly KPI Score (Sum of 4 Pillars)</span>
                <span className="text-2xl font-black text-white">
                  {(attScore + workScore + behScore + devScore).toFixed(1)} / 100%
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                Formula Validated
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1 text-xs">Manager Feedback & Development Plan</label>
              <textarea
                rows={3}
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Specific guidance, highlights, or required training modules..."
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveEvaluation}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
              >
                {isRtl ? `نشر تقييمي باسم ${currentUser.nameAr}` : `Publish My Evaluation as ${currentUser.nameEn}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: REPORTS VIEW */}
      {mode === 'reports' && isFullAccessUser && (
        <div className="space-y-6">
          {/* Quarterly Team Performance Trend Line Chart */}
          <QuarterlyTeamTrendChart
            defaultQuarter={selectedMonth <= 3 ? 'Q1' : selectedMonth <= 6 ? 'Q2' : selectedMonth <= 9 ? 'Q3' : 'Q4'}
          />

          {/* 12-Month Department-wide KPI Comparison & Trends */}
          <DepartmentKPITrendsVisualizer
            onOpenQuarterlyModal={() => setIsQuarterlyModalOpen(true)}
          />

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {isRtl ? 'جدول تقييمات الأداء لكافة موظفي الشركة (16 موظفاً)' : 'Master Company-wide KPI Roster (16 Staff)'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRawDataModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 transition border border-emerald-200"
                  title={isRtl ? 'تصدير البيانات الخام للتحليل الربع سنوي' : 'Export Raw Performance Data for Quarterly Review Analysis'}
                >
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isRtl ? 'بيانات الأداء الخام (CSV)' : 'Raw Quarterly Data (CSV)'}</span>
                </button>
                <button
                  onClick={() => setIsQuarterlyModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition border border-blue-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تقرير الربع سنوي الكامل (PDF/CSV)' : 'Quarterly Review Report (PDF/CSV)'}</span>
                </button>
                <button
                  onClick={handleExportKPIReport}
                  className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-100 transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('exportCsv')}</span>
                </button>
              </div>
            </div>

          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
              <tr>
                <th className="p-3 text-start">Employee</th>
                <th className="p-3 text-start">Department</th>
                <th className="p-3 text-start">Attendance (20%)</th>
                <th className="p-3 text-start">Work Delivery (40%)</th>
                <th className="p-3 text-start">Behavior (20%)</th>
                <th className="p-3 text-start">Self-Dev (20%)</th>
                <th className="p-3 text-start">Total (100%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const kpi = kpiRecords.find((r) => r.employeeId === u.id);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          src={u.avatarUrl}
                          name={isRtl ? u.nameAr : u.nameEn}
                          size="sm"
                          rounded="full"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block truncate">
                            {isRtl ? u.nameAr : u.nameEn}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{u.employeeCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 uppercase text-slate-600 font-medium">{u.departmentId}</td>
                    <td className="p-3 font-semibold text-blue-800">
                      {kpi?.attendanceScore.scoreOutOfWeight ?? 18.5} / 20
                    </td>
                    <td className="p-3 font-semibold text-emerald-800">
                      {kpi?.workScore.scoreOutOfWeight ?? 37.0} / 40
                    </td>
                    <td className="p-3 font-semibold text-purple-800">
                      {kpi?.behaviorScore.scoreOutOfWeight ?? 19.0} / 20
                    </td>
                    <td className="p-3 font-semibold text-amber-800">
                      {kpi?.selfDevScore.scoreOutOfWeight ?? 18.0} / 20
                    </td>
                    <td className="p-3 font-black text-slate-900 text-sm">
                      {kpi?.totalScore ?? 92.5}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Quarterly Performance Review Export Modal */}
      <QuarterlyReviewExportModal
        isOpen={isQuarterlyModalOpen}
        onClose={() => setIsQuarterlyModalOpen(false)}
        defaultQuarter={selectedMonth <= 3 ? 'Q1' : selectedMonth <= 6 ? 'Q2' : selectedMonth <= 9 ? 'Q3' : 'Q4'}
      />

      {/* Quarterly Raw Performance Data Export Modal */}
      <QuarterlyRawDataExportModal
        isOpen={isRawDataModalOpen}
        onClose={() => setIsRawDataModalOpen(false)}
        defaultQuarter={selectedMonth <= 3 ? 'Q1' : selectedMonth <= 6 ? 'Q2' : selectedMonth <= 9 ? 'Q3' : 'Q4'}
      />
    </div>
  );
};
