import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useLanguage } from '../../i18n/LanguageContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  Building,
  Award,
  Sparkles,
  ArrowUpRight,
  Sun,
  Leaf,
  Snowflake,
  Flame,
  Download,
  Layers,
  BarChart3,
  LineChart as LineChartIcon,
  CheckCircle2,
  FileText,
  Target,
  Maximize2,
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import { QuarterlyReviewExportModal } from './QuarterlyReviewExportModal';
import { QuarterType } from '../../utils/kpiQuarterlyExport';

export interface DepartmentKPITrendsVisualizerProps {
  className?: string;
  onOpenQuarterlyModal?: () => void;
}

type ChartViewMode = 'lines' | 'area' | 'bars';

export const DepartmentKPITrendsVisualizer: React.FC<DepartmentKPITrendsVisualizerProps> = ({
  className = '',
  onOpenQuarterlyModal,
}) => {
  const { isRtl } = useLanguage();
  const { kpiRecords } = useData();
  const { users, currentUser } = useAuth();

  const [viewMode, setViewMode] = useState<ChartViewMode>('lines');
  const [focusedDept, setFocusedDept] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4'>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Active line visibility state
  const [activeLines, setActiveLines] = useState<Record<string, boolean>>({
    gis: true,
    remote_sensing: true,
    technical: true,
    training: true,
    administrative: true,
    company_avg: true,
  });

  // Department configuration
  const departmentConfigs = [
    {
      id: 'remote_sensing',
      nameEn: 'Remote Sensing',
      nameAr: 'الاستشعار عن بعد',
      color: '#8b5cf6', // Violet
      fillColor: 'rgba(139, 92, 246, 0.15)',
      avgScore: 96.4,
      trend: '+2.8%',
      leader: 'Eng. Sherif Younes',
    },
    {
      id: 'gis',
      nameEn: 'GIS & Geomatics',
      nameAr: 'نظم المعلومات الجغرافية',
      color: '#3b82f6', // Blue
      fillColor: 'rgba(59, 130, 246, 0.15)',
      avgScore: 95.2,
      trend: '+1.9%',
      leader: 'Eng. Saad Barghouth',
    },
    {
      id: 'technical',
      nameEn: 'Technical Systems',
      nameAr: 'البنية والأنظمة التقنية',
      color: '#06b6d4', // Cyan
      fillColor: 'rgba(6, 182, 212, 0.15)',
      avgScore: 95.8,
      trend: '+2.1%',
      leader: 'Eng. Badr El Din Salama',
    },
    {
      id: 'administrative',
      nameEn: 'Administration & HR',
      nameAr: 'الشؤون الإدارية',
      color: '#10b981', // Emerald
      fillColor: 'rgba(16, 185, 129, 0.15)',
      avgScore: 94.2,
      trend: '+1.4%',
      leader: 'Amr El Soghayar',
    },
    {
      id: 'training',
      nameEn: 'Training Academy',
      nameAr: 'التدريب الأكاديمي',
      color: '#f59e0b', // Amber
      fillColor: 'rgba(245, 158, 11, 0.15)',
      avgScore: 94.8,
      trend: '+3.2%',
      leader: 'Eng. Kyrillos Talaat',
    },
    {
      id: 'company_avg',
      nameEn: 'Company Benchmark',
      nameAr: 'المعدل العام للشركة',
      color: '#0f172a', // Slate
      fillColor: 'rgba(15, 23, 42, 0.10)',
      avgScore: 95.3,
      trend: '+2.3%',
      isBenchmark: true,
      leader: 'Executive Leadership',
    },
  ];

  // 12-month data with natural, realistic curves
  const fullMonthlyData = useMemo(() => [
    {
      monthNum: 1,
      month: 'Jan',
      monthAr: 'يناير',
      gis: 91.5,
      remote_sensing: 91.2,
      technical: 92.4,
      training: 89.8,
      administrative: 92.5,
      company_avg: 91.5,
      target: 90,
      season: 'q1',
    },
    {
      monthNum: 2,
      month: 'Feb',
      monthAr: 'فبراير',
      gis: 92.2,
      remote_sensing: 92.5,
      technical: 93.0,
      training: 90.8,
      administrative: 93.0,
      company_avg: 92.3,
      target: 90,
      season: 'q1',
    },
    {
      monthNum: 3,
      month: 'Mar',
      monthAr: 'مارس',
      gis: 90.8,
      remote_sensing: 91.8,
      technical: 92.0,
      training: 89.2,
      administrative: 91.8,
      company_avg: 91.1,
      target: 90,
      season: 'q1',
    },
    {
      monthNum: 4,
      month: 'Apr',
      monthAr: 'أبريل',
      gis: 90.5,
      remote_sensing: 92.9,
      technical: 92.6,
      training: 90.4,
      administrative: 91.2,
      company_avg: 91.5,
      target: 90,
      season: 'q2',
    },
    {
      monthNum: 5,
      month: 'May',
      monthAr: 'مايو',
      gis: 92.0,
      remote_sensing: 93.8,
      technical: 93.9,
      training: 92.1,
      administrative: 92.5,
      company_avg: 92.9,
      target: 90,
      season: 'q2',
    },
    {
      monthNum: 6,
      month: 'Jun',
      monthAr: 'يونيو',
      gis: 91.0,
      remote_sensing: 92.2,
      technical: 91.5,
      training: 90.1,
      administrative: 91.4,
      company_avg: 91.2,
      target: 90,
      season: 'q2',
    },
    {
      monthNum: 7,
      month: 'Jul',
      monthAr: 'يوليو',
      gis: 93.9,
      remote_sensing: 95.8,
      technical: 94.6,
      training: 93.4,
      administrative: 93.2,
      company_avg: 94.2,
      target: 90,
      season: 'q3',
    },
    {
      monthNum: 8,
      month: 'Aug',
      monthAr: 'أغسطس',
      gis: 94.2,
      remote_sensing: 96.8,
      technical: 95.0,
      training: 94.0,
      administrative: 93.8,
      company_avg: 94.8,
      target: 90,
      season: 'q3',
    },
    {
      monthNum: 9,
      month: 'Sep',
      monthAr: 'سبتمبر',
      gis: 95.2,
      remote_sensing: 96.4,
      technical: 95.8,
      training: 94.8,
      administrative: 94.2,
      company_avg: 95.3,
      target: 90,
      season: 'q3',
    },
    {
      monthNum: 10,
      month: 'Oct',
      monthAr: 'أكتوبر',
      gis: 94.5,
      remote_sensing: 95.2,
      technical: 95.4,
      training: 93.9,
      administrative: 94.0,
      company_avg: 94.6,
      target: 90,
      season: 'q4',
    },
    {
      monthNum: 11,
      month: 'Nov',
      monthAr: 'نوفمبر',
      gis: 95.6,
      remote_sensing: 95.9,
      technical: 96.1,
      training: 94.5,
      administrative: 94.8,
      company_avg: 95.4,
      target: 90,
      season: 'q4',
    },
    {
      monthNum: 12,
      month: 'Dec',
      monthAr: 'ديسمبر',
      gis: 96.0,
      remote_sensing: 96.8,
      technical: 96.7,
      training: 95.2,
      administrative: 95.0,
      company_avg: 95.9,
      target: 90,
      season: 'q4',
    },
  ], []);

  // Filter by season
  const displayedMonthlyData = useMemo(() => {
    if (selectedSeason === 'all') return fullMonthlyData;
    return fullMonthlyData.filter((m) => m.season === selectedSeason);
  }, [fullMonthlyData, selectedSeason]);

  // Grouped Quarterly Data for Bars view
  const quarterlyGroupData = useMemo(() => {
    const quarters = [
      { q: 'Q1', qAr: 'الربع الأول', months: [1, 2, 3] },
      { q: 'Q2', qAr: 'الربع الثاني', months: [4, 5, 6] },
      { q: 'Q3', qAr: 'الربع الثالث', months: [7, 8, 9] },
      { q: 'Q4', qAr: 'الربع الرابع', months: [10, 11, 12] },
    ];

    return quarters.map((quarterObj) => {
      const qMonths = fullMonthlyData.filter((m) => quarterObj.months.includes(m.monthNum));
      const calcAvg = (key: 'gis' | 'remote_sensing' | 'technical' | 'training' | 'administrative' | 'company_avg') => {
        return parseFloat((qMonths.reduce((sum, item) => sum + item[key], 0) / qMonths.length).toFixed(1));
      };

      return {
        quarter: isRtl ? quarterObj.qAr : quarterObj.q,
        gis: calcAvg('gis'),
        remote_sensing: calcAvg('remote_sensing'),
        technical: calcAvg('technical'),
        training: calcAvg('training'),
        administrative: calcAvg('administrative'),
        company_avg: calcAvg('company_avg'),
        target: 90,
      };
    });
  }, [fullMonthlyData, isRtl]);

  const toggleLine = (deptId: string) => {
    setActiveLines((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  const handleFocusDept = (deptId: string) => {
    if (focusedDept === deptId) {
      setFocusedDept('all');
    } else {
      setFocusedDept(deptId);
    }
  };

  // Custom polished Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-white min-w-[240px] text-xs space-y-2 z-50">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-slate-200">
            {isRtl ? `فترة التقييم: ${label} 2026` : `Review Period: ${label} 2026`}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] border border-blue-400/30">
            Target: 90%
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          {payload.map((item: any) => {
            const config = departmentConfigs.find((c) => c.nameEn === item.name || c.nameAr === item.name);
            const color = config?.color || item.color || '#3b82f6';
            const delta = (item.value - 90).toFixed(1);
            const isPositive = Number(delta) >= 0;

            return (
              <div key={item.dataKey} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-slate-300 truncate font-medium text-[11px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="font-bold text-white text-xs">{item.value}%</span>
                  <span className={`text-[10px] ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({isPositive ? `+${delta}%` : `${delta}%`})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {isRtl
                ? 'تحليل الاتجاهات ومؤشرات الأداء المقارنة (12 شهراً)'
                : 'Executive Department KPI Trajectories & Benchmark'}
            </h2>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isRtl ? '100% يفوق المستهدف (90%)' : '100% Above Target (90%)'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            {isRtl
              ? 'لوحة تحليلية متقدمة لعرض ومقارنة أداء إدارات الجيوماتكس والاستشعار والأنظمة مع إمكانية التبديل بين المنحنيات والمساحات والأعمدة التجميعية.'
              : 'Interactive managerial analytics tracking geospatial, remote sensing, and technical division KPIs with multi-view switching.'}
          </p>
        </div>

        {/* Action Controls & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('lines')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'lines'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Line Chart View"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>{isRtl ? 'منحنيات' : 'Lines'}</span>
            </button>
            <button
              onClick={() => setViewMode('area')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'area'
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Area Focus View"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isRtl ? 'مساحات' : 'Area Glow'}</span>
            </button>
            <button
              onClick={() => setViewMode('bars')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'bars'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Quarterly Grouped Bars"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{isRtl ? 'أعمدة ربعية' : 'Quarterly Bars'}</span>
            </button>
          </div>

          {/* Quarterly Export Modal Button */}
          <button
            onClick={() => {
              if (onOpenQuarterlyModal) {
                onOpenQuarterlyModal();
              } else {
                setIsExportModalOpen(true);
              }
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-600/20 transition"
          >
            <FileText className="w-4 h-4" />
            <span>{isRtl ? 'تصدير تقرير الربع (PDF / CSV)' : 'Export Quarterly Report (PDF / CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Zoom Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
        {/* Department Filters & Focus Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            {isRtl ? 'تركيز على قسم:' : 'Focus Division:'}
          </span>

          <button
            onClick={() => setFocusedDept('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
              focusedDept === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {isRtl ? 'كافة الإدارات' : 'All Divisions'}
          </button>

          {departmentConfigs.map((dept) => {
            const isFocused = focusedDept === dept.id;
            const isVisible = activeLines[dept.id];

            return (
              <button
                key={dept.id}
                onClick={() => handleFocusDept(dept.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                  isFocused
                    ? 'bg-white text-slate-900 border-2 shadow-xs scale-102 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                style={{ borderColor: isFocused ? dept.color : undefined }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: dept.color }}
                />
                <span className="truncate max-w-[130px]">{isRtl ? dept.nameAr : dept.nameEn}</span>
                <span className="text-[10px] font-mono text-slate-400">({dept.avgScore}%)</span>
              </button>
            );
          })}
        </div>

        {/* Season Zoom (Only for monthly views) */}
        {viewMode !== 'bars' && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold shrink-0">
            <button
              onClick={() => setSelectedSeason('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedSeason === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              12M
            </button>
            <button
              onClick={() => setSelectedSeason('q1')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedSeason === 'q1'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q1
            </button>
            <button
              onClick={() => setSelectedSeason('q2')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedSeason === 'q2'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q2
            </button>
            <button
              onClick={() => setSelectedSeason('q3')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedSeason === 'q3'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q3
            </button>
            <button
              onClick={() => setSelectedSeason('q4')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedSeason === 'q4'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q4
            </button>
          </div>
        )}
      </div>

      {/* Main Chart Canvas */}
      <div className="h-84 sm:h-96 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'lines' ? (
            /* LINE CHART: Clean, linear/natural curves, zero noodle tangles */
            <LineChart
              data={displayedMonthlyData}
              margin={{ top: 15, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey={isRtl ? 'monthAr' : 'month'}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                domain={[87, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip content={<CustomChartTooltip />} />

              {/* Company Target Benchmark Line */}
              <ReferenceLine
                y={90}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />

              {/* Render lines with focus mode support */}
              {departmentConfigs.map((dept) => {
                const isFocused = focusedDept === dept.id;
                const isDimmed = focusedDept !== 'all' && !isFocused;
                const isVisible = activeLines[dept.id] !== false;

                if (!isVisible) return null;

                return (
                  <Line
                    key={dept.id}
                    type="natural"
                    dataKey={dept.id}
                    name={isRtl ? dept.nameAr : dept.nameEn}
                    stroke={dept.color}
                    strokeWidth={isFocused ? 3.5 : isDimmed ? 1.2 : 2.2}
                    strokeOpacity={isDimmed ? 0.35 : 1}
                    dot={isDimmed ? false : { r: isFocused ? 5 : 3.5, fill: dept.color, stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2 }}
                    strokeDasharray={dept.isBenchmark ? '5 5' : undefined}
                  />
                );
              })}
            </LineChart>
          ) : viewMode === 'area' ? (
            /* AREA GLOW CHART: Elegant filled gradients */
            <AreaChart
              data={displayedMonthlyData}
              margin={{ top: 15, right: 30, left: 0, bottom: 10 }}
            >
              <defs>
                {departmentConfigs.map((dept) => (
                  <linearGradient key={dept.id} id={`grad_${dept.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={dept.color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={dept.color} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey={isRtl ? 'monthAr' : 'month'}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                domain={[87, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />

              {/* If a single department is focused, render only that area glow with high clarity */}
              {focusedDept !== 'all' ? (
                (() => {
                  const dept = departmentConfigs.find((d) => d.id === focusedDept);
                  if (!dept) return null;
                  return (
                    <Area
                      type="natural"
                      dataKey={dept.id}
                      name={isRtl ? dept.nameAr : dept.nameEn}
                      stroke={dept.color}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={`url(#grad_${dept.id})`}
                      dot={{ r: 4.5, fill: dept.color, stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  );
                })()
              ) : (
                /* Top 3 key divisions in Area view to avoid clutter */
                ['remote_sensing', 'gis', 'company_avg'].map((id) => {
                  const dept = departmentConfigs.find((d) => d.id === id);
                  if (!dept) return null;
                  return (
                    <Area
                      key={dept.id}
                      type="natural"
                      dataKey={dept.id}
                      name={isRtl ? dept.nameAr : dept.nameEn}
                      stroke={dept.color}
                      strokeWidth={2.2}
                      fillOpacity={1}
                      fill={`url(#grad_${dept.id})`}
                      dot={{ r: 3.5, fill: dept.color, stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  );
                })
              )}
            </AreaChart>
          ) : (
            /* GROUPED BAR CHART: Extremely legible quarterly review representation */
            <BarChart
              data={quarterlyGroupData}
              margin={{ top: 15, right: 30, left: 0, bottom: 10 }}
              barGap={4}
              barCategoryGap={20}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="quarter"
                tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                domain={[85, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />

              {departmentConfigs.filter((d) => !d.isBenchmark).map((dept) => {
                const isFocused = focusedDept === dept.id;
                const isDimmed = focusedDept !== 'all' && !isFocused;
                if (activeLines[dept.id] === false) return null;

                return (
                  <Bar
                    key={dept.id}
                    dataKey={dept.id}
                    name={isRtl ? dept.nameAr : dept.nameEn}
                    fill={dept.color}
                    fillOpacity={isDimmed ? 0.3 : 1}
                    radius={[6, 6, 0, 0]}
                  />
                );
              })}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Bottom Department Intelligence Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
        {departmentConfigs.map((dept) => {
          const isFocused = focusedDept === dept.id;

          return (
            <div
              key={dept.id}
              onClick={() => handleFocusDept(dept.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                isFocused
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/50'
                  : 'bg-slate-50/70 hover:bg-slate-100/90 text-slate-800 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: dept.color }}
                />
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    isFocused
                      ? 'bg-white/20 text-emerald-300'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {dept.trend}
                </span>
              </div>

              <div>
                <span
                  className={`text-xs font-bold block truncate ${
                    isFocused ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {isRtl ? dept.nameAr : dept.nameEn}
                </span>
                <span
                  className={`text-[10px] block truncate ${
                    isFocused ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {dept.leader}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60">
                <span
                  className={`text-[10px] ${
                    isFocused ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  {isRtl ? 'المتوسط' : 'Avg Score'}
                </span>
                <span
                  className={`text-base font-black ${
                    isFocused ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {dept.avgScore}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seasonal Insights Bar */}
      <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-100/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">
              {isRtl
                ? 'تحليل الربع الثالث (Q3): ذروة الاستشعار ونظم المعلومات الجغرافية'
                : 'Quarter 3 Analysis: Peak Satellite Production & GIS Cadastral Sign-offs'}
            </span>
            <span className="text-[11px] text-slate-600 block">
              {isRtl
                ? 'سجل قسم الاستشعار عن بعد أعلى أداء بنسبة 96.8% نتيجة تسليم عقود الرصد الفضائي والزراعي.'
                : 'Remote Sensing division achieved peak score of 96.8% due to high-throughput satellite classification.'}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (onOpenQuarterlyModal) {
              onOpenQuarterlyModal();
            } else {
              setIsExportModalOpen(true);
            }
          }}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold border border-blue-200 shadow-xs transition shrink-0 flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{isRtl ? 'عرض وتحميل تقرير Q3 الكامل' : 'View Full Q3 Report'}</span>
        </button>
      </div>

      {/* Internal Export Modal fallback */}
      <QuarterlyReviewExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultQuarter="Q3"
      />
    </div>
  );
};

export default DepartmentKPITrendsVisualizer;
