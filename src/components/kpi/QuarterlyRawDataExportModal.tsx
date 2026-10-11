import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  X,
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Layers,
  Database,
  CheckCircle2,
  Table,
  HelpCircle,
  FileDown,
} from 'lucide-react';
import {
  QuarterType,
  calculateQuarterlyPerformance,
  exportRawQuarterlyPerformanceCSV,
} from '../../utils/kpiQuarterlyExport';
import { UserAvatar } from '../common/UserAvatar';

interface QuarterlyRawDataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuarter?: QuarterType;
}

export const QuarterlyRawDataExportModal: React.FC<QuarterlyRawDataExportModalProps> = ({
  isOpen,
  onClose,
  defaultQuarter = 'Q3',
}) => {
  const { users } = useAuth();
  const { kpiRecords, attendanceRecords, tasks } = useData();
  const { isRtl } = useLanguage();

  const [selectedQuarter, setSelectedQuarter] = useState<QuarterType | 'ALL'>(defaultQuarter);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'matrix' | 'time_series'>('matrix');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Compute live preview data
  const previewData = useMemo(() => {
    const activeQ: QuarterType = selectedQuarter === 'ALL' ? 'Q3' : selectedQuarter;
    return calculateQuarterlyPerformance(
      users,
      kpiRecords,
      activeQ,
      selectedYear,
      selectedDepartment
    );
  }, [users, kpiRecords, selectedQuarter, selectedYear, selectedDepartment]);

  if (!isOpen) return null;

  const quartersList: { id: QuarterType | 'ALL'; nameEn: string; nameAr: string }[] = [
    { id: 'Q3', nameEn: 'Q3 (Jul - Sep 2026) • Current Active', nameAr: 'الربع الثالث (يوليو - سبتمبر) • الحالي' },
    { id: 'Q1', nameEn: 'Q1 (Jan - Mar 2026)', nameAr: 'الربع الأول (يناير - مارس)' },
    { id: 'Q2', nameEn: 'Q2 (Apr - Jun 2026)', nameAr: 'الربع الثاني (أبريل - يونيو)' },
    { id: 'Q4', nameEn: 'Q4 (Oct - Dec 2026)', nameAr: 'الربع الرابع (أكتوبر - ديسمبر)' },
    { id: 'ALL', nameEn: 'Full Year 2026 (All 4 Quarters Consolidated)', nameAr: 'كامل العام 2026 (جميع الأرباع الأربعة)' },
  ];

  const departmentsList = [
    { id: 'all', nameEn: 'All Departments (16 Official Staff)', nameAr: 'كافة الأقسام (16 موظفاً رسمياً)' },
    { id: 'gis', nameEn: 'GIS Department', nameAr: 'قسم نظم المعلومات الجغرافية' },
    { id: 'remote_sensing', nameEn: 'Remote Sensing Department', nameAr: 'قسم الاستشعار عن بعد' },
    { id: 'executive', nameEn: 'Executive Management', nameAr: 'الإدارة التنفيذية العليا' },
    { id: 'technical', nameEn: 'Technical Systems', nameAr: 'قسم الأنظمة والتقنية' },
    { id: 'administrative', nameEn: 'Administration', nameAr: 'الشؤون الإدارية' },
    { id: 'training', nameEn: 'Training & Development', nameAr: 'قسم التدريب والتأهيل' },
  ];

  const handleDownload = () => {
    setIsExporting(true);
    try {
      exportRawQuarterlyPerformanceCSV({
        quarter: selectedQuarter,
        year: selectedYear,
        departmentFilter: selectedDepartment,
        users,
        kpiRecords,
        attendanceRecords,
        tasks,
        format: exportFormat,
        isRtl,
      });
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const previewItems = previewData.items.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/30 border border-emerald-400/30 text-emerald-300">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {isRtl
                    ? 'تصدير بيانات الأداء الخام للتحليل الربع سنوي (CSV Raw Data)'
                    : 'Export Raw Performance Data for Quarterly Review Analysis (CSV)'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-400/30">
                  Excel & BI Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isRtl
                  ? 'ملف CSV تفصيلي يحتوي على الدرجات الشهرية الخام والمقاييس الفرعية لدعم التحليل الإحصائي ونماذج Pivot.'
                  : 'Tabular dataset containing raw monthly pillar scores, task outputs, and attendance metrics for statistical analysis.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Success Banner */}
          {copiedNotification && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                {isRtl
                  ? 'تم تحميل ملف البيانات الخام بنجاح بصيغة CSV المتوافقة مع Excel!'
                  : 'Raw performance dataset downloaded successfully in Excel-compatible CSV format!'}
              </span>
            </div>
          )}

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            {/* Quarter Filter */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{isRtl ? 'الفترة الربع سنوية:' : 'Review Quarter:'}</span>
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500"
              >
                {quartersList.map((q) => (
                  <option key={q.id} value={q.id}>
                    {isRtl ? q.nameAr : q.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isRtl ? 'القسم / الفريق:' : 'Department Filter:'}</span>
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500"
              >
                {departmentsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {isRtl ? d.nameAr : d.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Format Structure */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>{isRtl ? 'تنسيق بنية البيانات:' : 'Dataset Layout:'}</span>
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="matrix">
                  {isRtl ? 'مصفوفة عريضة (صف لكل موظف + الأعمدة الشهرية)' : 'Wide Matrix (1 row per employee + monthly columns)'}
                </option>
                <option value="time_series">
                  {isRtl ? 'سلسلة زمنية طولية (صف لكل موظف/شهر لنماذج BI)' : 'Time-Series Long Format (1 row per emp-month for BI)'}
                </option>
              </select>
            </div>
          </div>

          {/* Dataset Specifications & Fields Included */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <span>{isRtl ? 'الحقول والبيانات المتضمنة في ملف الـ CSV' : 'Included Raw Performance Attributes'}</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                {exportFormat === 'matrix' ? '48 Raw Columns' : '26 Granular Fields'} • UTF-8 BOM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">1. Employee Metadata</span>
                <p className="text-slate-500">Code, English & Arabic Full Names, Department, Job Title, Role Tier</p>
              </div>
              <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 space-y-1">
                <span className="font-bold text-blue-900 block">2. Monthly Raw Pillars</span>
                <p className="text-blue-700">Month 1, 2, 3 raw scores for Attendance (20), Work (40), Behavior (20), Self-Dev (20)</p>
              </div>
              <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-900 block">3. Quarterly Aggregates</span>
                <p className="text-emerald-700">Weighted Average %, Performance Band, Company Rank, Department Rank</p>
              </div>
              <div className="p-2.5 bg-purple-50/60 rounded-lg border border-purple-200 space-y-1">
                <span className="font-bold text-purple-900 block">4. Operational Drivers</span>
                <p className="text-purple-700">Tasks assigned/done, spatial quality scores, punctuality %, net & overtime hours</p>
              </div>
            </div>
          </div>

          {/* Data Preview (First 5 Rows) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">
                {isRtl ? 'معاينة عينة من البيانات المجهزة للتصدير (أول 5 سجلات):' : 'Sample Data Preview (Top 5 Records):'}
              </span>
              <span className="text-slate-500 text-[11px]">
                {isRtl ? `إجمالي الموظفين: ${previewData.items.length}` : `Total records: ${previewData.items.length} employees`}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-start text-[11px]">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-start">Code</th>
                    <th className="p-2.5 text-start">Staff Member</th>
                    <th className="p-2.5 text-start">Department</th>
                    <th className="p-2.5 text-center">M1</th>
                    <th className="p-2.5 text-center">M2</th>
                    <th className="p-2.5 text-center">M3</th>
                    <th className="p-2.5 text-center">Quarterly Composite</th>
                    <th className="p-2.5 text-center">Rating Band</th>
                    <th className="p-2.5 text-center">Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {previewItems.map((item, idx) => (
                    <tr key={item.employee.id} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 text-slate-500">{item.employee.employeeCode}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-900 flex items-center gap-2">
                        <UserAvatar
                          src={item.employee.avatarUrl}
                          name={isRtl ? item.employee.nameAr : item.employee.nameEn}
                          size="xs"
                          rounded="full"
                        />
                        <span>{isRtl ? item.employee.nameAr : item.employee.nameEn}</span>
                      </td>
                      <td className="p-2.5 font-sans text-slate-600 uppercase text-[10px]">
                        {item.employee.departmentId}
                      </td>
                      <td className="p-2.5 text-center">{item.monthlyScores[0]?.score ?? '--'}%</td>
                      <td className="p-2.5 text-center">{item.monthlyScores[1]?.score ?? '--'}%</td>
                      <td className="p-2.5 text-center">{item.monthlyScores[2]?.score ?? '--'}%</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">
                        {item.quarterlyScore}%
                      </td>
                      <td className="p-2.5 text-center font-sans font-semibold text-slate-700">
                        {isRtl ? item.ratingBandAr : item.ratingBand}
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-500">#{idx + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dual Approval Footnote */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center gap-2 text-slate-700 text-[11px]">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isRtl
                ? 'ملاحظة: البيانات تتضمن التوقيع والاعتماد الثنائي الإلزامي من المؤسسين (م. محمد عمر و د. غادة) وتصديق د. محمد بدوي.'
                : 'Note: Dataset includes certified governance metadata with mandatory dual signatures from Eng. Mohamed Omar and Dr. Ghada.'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            {exportFormat === 'matrix' ? 'CSV Matrix Layout' : 'CSV Long Time-Series'} • UTF-8 BOM
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shadow-xs"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>
                {isExporting
                  ? isRtl ? 'جارٍ التحميل...' : 'Downloading CSV...'
                  : isRtl ? 'تحميل بيانات الأداء الخام (CSV)' : 'Download Raw Performance CSV'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
