import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Filter,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle2,
  Users,
  Building,
  ShieldCheck,
} from 'lucide-react';
import {
  QuarterType,
  calculateQuarterlyPerformance,
  exportQuarterlyCSV,
  exportQuarterlyPDF,
  exportRawQuarterlyPerformanceCSV,
} from '../../utils/kpiQuarterlyExport';
import { UserAvatar } from '../common/UserAvatar';

interface QuarterlyReviewExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuarter?: QuarterType;
}

export const QuarterlyReviewExportModal: React.FC<QuarterlyReviewExportModalProps> = ({
  isOpen,
  onClose,
  defaultQuarter = 'Q3',
}) => {
  const { users, currentUser } = useAuth();
  const { kpiRecords, attendanceRecords, tasks } = useData();
  const { t, isRtl } = useLanguage();

  const [selectedQuarter, setSelectedQuarter] = useState<QuarterType>(defaultQuarter);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingRawCsv, setIsExportingRawCsv] = useState(false);

  // Compute live quarterly data based on filters
  const quarterlyData = useMemo(() => {
    return calculateQuarterlyPerformance(
      users,
      kpiRecords,
      selectedQuarter,
      selectedYear,
      selectedDepartment
    );
  }, [users, kpiRecords, selectedQuarter, selectedYear, selectedDepartment]);

  if (!isOpen) return null;

  const { items, stats } = quarterlyData;

  const quartersList: { id: QuarterType; nameEn: string; nameAr: string }[] = [
    { id: 'Q1', nameEn: 'Q1 (Jan - Mar)', nameAr: 'الربع الأول (يناير - مارس)' },
    { id: 'Q2', nameEn: 'Q2 (Apr - Jun)', nameAr: 'الربع الثاني (أبريل - يونيو)' },
    { id: 'Q3', nameEn: 'Q3 (Jul - Sep)', nameAr: 'الربع الثالث (يوليو - سبتمبر)' },
    { id: 'Q4', nameEn: 'Q4 (Oct - Dec)', nameAr: 'الربع الرابع (أكتوبر - ديسمبر)' },
  ];

  const departmentsList = [
    { id: 'all', nameEn: 'All Departments', nameAr: 'كافة الأقسام والمجموعات' },
    { id: 'executive', nameEn: 'Executive Management', nameAr: 'الإدارة التنفيذية العليا' },
    { id: 'gis', nameEn: 'GIS Department', nameAr: 'قسم نظم المعلومات الجغرافية' },
    { id: 'remote_sensing', nameEn: 'Remote Sensing Department', nameAr: 'قسم الاستشعار عن بعد' },
    { id: 'technical', nameEn: 'Technical Systems', nameAr: 'قسم الأنظمة والتقنية' },
    { id: 'administrative', nameEn: 'Administration', nameAr: 'الشؤون الإدارية' },
    { id: 'training', nameEn: 'Training & Development', nameAr: 'قسم التدريب والتأهيل' },
  ];

  const handleDownloadCsv = () => {
    setIsExportingCsv(true);
    try {
      exportQuarterlyCSV(quarterlyData, isRtl);
    } finally {
      setTimeout(() => setIsExportingCsv(false), 800);
    }
  };

  const handleDownloadRawCsv = () => {
    setIsExportingRawCsv(true);
    try {
      exportRawQuarterlyPerformanceCSV({
        quarter: selectedQuarter,
        year: selectedYear,
        departmentFilter: selectedDepartment,
        users,
        kpiRecords,
        attendanceRecords,
        tasks,
        format: 'matrix',
        isRtl,
      });
    } finally {
      setTimeout(() => setIsExportingRawCsv(false), 800);
    }
  };

  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    try {
      exportQuarterlyPDF(quarterlyData, currentUser.nameEn, isRtl);
    } finally {
      setTimeout(() => setIsExportingPdf(false), 800);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {isRtl
                    ? 'تصدير تقرير المراجعة الربع سنوية لأداء الفريق (PDF / CSV)'
                    : 'Quarterly Team Performance Review Export (PDF & CSV)'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-400/30">
                  {selectedQuarter} {selectedYear}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {isRtl
                  ? 'تقرير تحليلي مخصص للاجتماعات الإدارية، تقييمات الربع السنوي، وأرشفة HR المعتمدة'
                  : 'Executive reporting dossier for manager quarterly reviews and HR archival records'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quarter Selector */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-600">{isRtl ? 'الربع:' : 'Quarter:'}</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value as QuarterType)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {quartersList.map((q) => (
                  <option key={q.id} value={q.id}>
                    {isRtl ? q.nameAr : q.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-600">{isRtl ? 'السنة:' : 'Year:'}</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <Building className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">{isRtl ? 'القسم:' : 'Dept:'}</span>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {departmentsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {isRtl ? d.nameAr : d.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              disabled={isExportingCsv}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingCsv ? (isRtl ? 'جاري التصدير...' : 'Exporting...') : (isRtl ? 'تصدير CSV (إكسيل)' : 'Export CSV (Excel)')}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{isExportingPdf ? (isRtl ? 'جاري إنشاء PDF...' : 'Generating...') : (isRtl ? 'تنزيل PDF رسمي' : 'Download PDF Report')}</span>
            </button>

            <button
              onClick={handlePrint}
              title={isRtl ? 'طباعة التقرير' : 'Print / Save PDF'}
              className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Executive Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-blue-700 block">
                {isRtl ? 'إجمالي الموظفين المقيمين' : 'Evaluated Staff'}
              </span>
              <span className="text-xl font-black text-blue-900 block">
                {stats.totalEmployees}
              </span>
              <span className="text-[10px] text-blue-600 font-medium block">
                {isRtl ? '100% نسبة تغطية المنظومة' : '100% Roster Coverage'}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-emerald-700 block">
                {isRtl ? 'متوسط أداء الربع' : 'Quarter Average'}
              </span>
              <span className="text-xl font-black text-emerald-900 block">
                {stats.averageScore}%
              </span>
              <span className="text-[10px] text-emerald-600 font-medium block">
                {stats.averageScore >= 90
                  ? (isRtl ? 'مستوى أداء ممتاز' : 'High Performance Level')
                  : (isRtl ? 'مستوى أداء مرضي' : 'Satisfactory Performance')}
              </span>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-amber-700 block">
                {isRtl ? 'أعلى تقييم بالربع' : 'Top Score'}
              </span>
              <span className="text-xl font-black text-amber-900 block">
                {stats.highestScore}%
              </span>
              <span className="text-[10px] text-amber-700 truncate font-medium block">
                {stats.topPerformer}
              </span>
            </div>

            <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-purple-700 block">
                {isRtl ? 'أداء استثنائي (≥95%)' : 'Outstanding Tier'}
              </span>
              <span className="text-xl font-black text-purple-900 block">
                {stats.outstandingCount} {isRtl ? 'عضواً' : 'Staff'}
              </span>
              <span className="text-[10px] text-purple-600 font-medium block">
                {stats.exceedsCount} {isRtl ? 'يفوق التوقعات' : 'Exceeds target'}
              </span>
            </div>
          </div>

          {/* Performance Distribution Bands */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>{isRtl ? 'توزيع مستويات الأداء في الربع المحدد:' : 'Quarterly Rating Distribution:'}</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                {isRtl ? 'استثنائي (≥95%):' : 'Outstanding (≥95%):'} {stats.outstandingCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-[11px]">
                {isRtl ? 'يفوق التوقعات (90-94%):' : 'Exceeds (90-94%):'} {stats.exceedsCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px]">
                {isRtl ? 'يلبي التوقعات (80-89%):' : 'Meets (80-89%):'} {stats.meetsCount}
              </span>
              {stats.needsImprovementCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px]">
                  {isRtl ? 'يحتاج تحسين (<80%):' : 'Needs Work (<80%):'} {stats.needsImprovementCount}
                </span>
              )}
            </div>
          </div>

          {/* Detailed Preview Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                <span>
                  {isRtl
                    ? `جدول درجات الموظفين التفصيلي (${items.length} موظف)`
                    : `Quarterly Detailed Employee Breakdown (${items.length} Members)`}
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {isRtl ? 'مرتب تنازلياً حسب التقييم النهائي' : 'Sorted descending by quarterly weighted score'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    <th className="p-3 text-start">{isRtl ? 'الترتيب' : 'Rank'}</th>
                    <th className="p-3 text-start">{isRtl ? 'الموظف' : 'Employee'}</th>
                    <th className="p-3 text-start">{isRtl ? 'القسم' : 'Dept'}</th>
                    <th className="p-3 text-center">{isRtl ? 'الحضور (20%)' : 'Attendance (20%)'}</th>
                    <th className="p-3 text-center">{isRtl ? 'المخرجات (40%)' : 'Work (40%)'}</th>
                    <th className="p-3 text-center">{isRtl ? 'السلوك (20%)' : 'Behavior (20%)'}</th>
                    <th className="p-3 text-center">{isRtl ? 'التطوير (20%)' : 'Self-Dev (20%)'}</th>
                    <th className="p-3 text-center">{isRtl ? 'مجموع الربع' : 'Quarterly Score'}</th>
                    <th className="p-3 text-start">{isRtl ? 'المستوى' : 'Rating Band'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.employee.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-bold text-slate-500 text-center">#{idx + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={item.employee.avatarUrl}
                            name={isRtl ? item.employee.nameAr : item.employee.nameEn}
                            size="sm"
                            rounded="full"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block truncate">
                              {isRtl ? item.employee.nameAr : item.employee.nameEn}
                            </span>
                            <span className="text-[10px] text-blue-700 font-mono font-semibold block">
                              {item.employee.employeeCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 uppercase font-medium text-slate-600 text-[11px]">
                        {item.employee.departmentId}
                      </td>
                      <td className="p-3 text-center font-semibold text-blue-800">
                        {item.attendanceAvg} / 20
                      </td>
                      <td className="p-3 text-center font-semibold text-emerald-800">
                        {item.workAvg} / 40
                      </td>
                      <td className="p-3 text-center font-semibold text-purple-800">
                        {item.behaviorAvg} / 20
                      </td>
                      <td className="p-3 text-center font-semibold text-amber-800">
                        {item.selfDevAvg} / 20
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-black text-slate-900 text-sm px-2 py-0.5 rounded-md bg-slate-100">
                          {item.quarterlyScore}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                            item.quarterlyScore >= 95
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.quarterlyScore >= 90
                              ? 'bg-blue-100 text-blue-800'
                              : item.quarterlyScore >= 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isRtl ? item.ratingBandAr : item.ratingBand}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Signatures Footnote */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {isRtl
                  ? 'التقرير معتمد ثنائياً من المؤسسين (م. محمد عمر و د. غادة) ومصدق من الإدارة التنفيذية.'
                  : 'Report verified under mandatory dual executive signatories (Eng. Mohamed Omar & Dr. Ghada).'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadRawCsv}
                className="text-emerald-700 hover:underline font-bold text-xs flex items-center gap-1"
                title="Download raw performance data with all monthly pillars & task drivers"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تحميل البيانات الخام (Raw CSV)' : 'Download Raw CSV'}</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleDownloadCsv}
                className="text-slate-700 hover:underline font-bold text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRtl ? 'ملخص الربع (CSV)' : 'Executive CSV'}</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleDownloadPdf}
                className="text-blue-700 hover:underline font-bold text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تحميل كـ PDF' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {isRtl
              ? `جاهز للتصدير: ${items.length} موظفاً للفترة ${selectedQuarter} ${selectedYear}`
              : `Ready to export: ${items.length} records for ${selectedQuarter} ${selectedYear}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadRawCsv}
              disabled={isExportingRawCsv}
              className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{isRtl ? 'تصدير البيانات الخام (CSV)' : 'Export Raw Data (CSV)'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{isRtl ? 'تصدير PDF الآن' : 'Export PDF Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
