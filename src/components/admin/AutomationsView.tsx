import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Cpu, Play, CheckCircle, Clock, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export const AutomationsView: React.FC = () => {
  const { runAutomations, lastAutomationRun } = useData();
  const { t, isRtl } = useLanguage();

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'Automations daemon active and monitoring events.',
    'Geofence 500m threshold validation scanner initialized.',
    'Dual Signatory Workflow listener subscribed to Eng. Mohamed Omar & Dr. Ghada signatures.',
    'Overtime calculator initialized with 8-hour daily policy.',
  ]);

  const handleRunNow = () => {
    setIsRunning(true);
    setTimeout(() => {
      const executed = runAutomations();
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Manual trigger cycle completed:`,
        ...executed.map((e) => `  ✓ ${e}`),
        ...prev,
      ]);
      setIsRunning(false);
    }, 600);
  };

  const automationRules = [
    {
      titleEn: 'Login Attendance Auto Check-in & Geofence Validator',
      titleAr: 'التحقق التلقائي من الحضور والسياج الجغرافي عند الدخول',
      triggerEn: 'Upon Employee Login',
      triggerAr: 'فور تسجيل دخول الموظف',
      actionEn: 'Validates browser GPS vs 500m geofence. Checks active WFH/field permits, creates attendance record.',
      actionAr: 'يفحص إحداثيات GPS ونطاق الـ 500 متر. يتحقق من أذونات العمل عن بُعد، ويُسجل الحضور.',
      statusEn: 'Active',
      statusAr: 'نشط',
    },
    {
      titleEn: 'Logout Auto Check-out & Overtime Engine',
      titleAr: 'تسجيل الانصراف وحساب الساعات والإضافي تلقائياً',
      triggerEn: 'Upon Employee Sign-Out',
      triggerAr: 'فور تسجيل الخروج',
      actionEn: 'Computes net hours, regular hours, overtime, late/early minutes, presents summary dialog.',
      actionAr: 'يحسب ساعات العمل الفعلي، الإضافي (Overtime)، التأخير، ويعرض نافذة الملخص اليومي.',
      statusEn: 'Active',
      statusAr: 'نشط',
    },
    {
      titleEn: 'Mandatory Dual Signatory Leave Synchronizer',
      titleAr: 'مزامنة الاعتماد الثنائي الإلزامي للإجازات',
      triggerEn: 'Leave Approval Steps',
      triggerAr: 'خطوات اعتماد الإجازات والأذونات',
      actionEn: 'Waits for both Eng. Mohamed Omar & Dr. Ghada. If either rejects: instant rejection. If both approve: deducts balances & updates attendance.',
      actionAr: 'يشترط موافقة م. محمد عمر و د. غادة معاً. الرفض يلغي فوراً، والموافقة تخصم الرصيد وتزامن الحضور.',
      statusEn: 'Active',
      statusAr: 'نشط',
    },
    {
      titleEn: 'Overdue GIS Tasks Auto-Scanner',
      titleAr: 'الفاحص الآلي لمهام ومشاريع GIS المتأخرة',
      triggerEn: 'Scheduled Hourly Cron',
      triggerAr: 'فحص دوري كل ساعة',
      actionEn: 'Scans tasks past due date, sets status to Overdue and fires critical alert to assignee and project manager.',
      actionAr: 'يفحص المهام التي تجاوزت الموعد، يحول حالتها إلى "متأخرة"، ويرسل تنبيهاً للمكلف والمدير.',
      statusEn: 'Active',
      statusAr: 'نشط',
    },
    {
      titleEn: 'End-of-Day Missing Check-Out Closer',
      titleAr: 'إغلاق جلسات الحضور المفتوحة في نهاية اليوم',
      triggerEn: 'Daily at 18:30',
      triggerAr: 'يومياً الساعة 6:30 مساءً',
      actionEn: 'Flags unclosed sessions, notifies HR Director Amr El Soghayar, sends reminder to employee.',
      actionAr: 'يرصد الجلسات غير المغلقة، ويُخطر المدير الإداري عمرو الصغير، ويُرسل تذكيراً للموظف.',
      statusEn: 'Active',
      statusAr: 'نشط',
    },
    {
      titleEn: '100% KPI Monthly 4-Category Auto-Aggregator',
      titleAr: 'محرك تجميع درجات مؤشر الأداء KPI (100% معياري)',
      triggerEn: 'Monthly Closing',
      triggerAr: 'عند الإغلاق الشهري',
      actionEn: 'Calculates Attendance (20%), Task Delivery (40%), Behavior (20%), and Self-Dev (20%) scores.',
      actionAr: 'يجمع تلقائياً الحضور (20%)، إنجاز المهام (40%)، السلوك (20%)، والتطوير الذاتي (20%).',
      statusEn: 'Active',
      statusAr: 'نشط',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('automationsTitle')}</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              6 Active Background Daemons
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'محرك الأتمتة المدمج لمراقبة الحضور، تجاوز السياج، الاعتمادات الثنائية، ومؤشرات الأداء.'
              : 'Autonomous background workflows for geofence validation, dual approval leaves, and KPI calculations.'}
          </p>
        </div>

        <button
          onClick={handleRunNow}
          disabled={isRunning}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? t('loading') : t('runAutomationsNow')}</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {automationRules.map((rule, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 text-xs flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {isRtl ? rule.statusAr : rule.statusEn}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isRtl ? `محرك برمجي #${idx + 1}` : `Daemon #${idx + 1}`}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? rule.titleAr : rule.titleEn}
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                {isRtl ? rule.actionAr : rule.actionEn}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-blue-700 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{isRtl ? 'المحفز البرمجي: ' : 'Trigger: '}{isRtl ? rule.triggerAr : rule.triggerEn}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live Automation Logs Terminal */}
      <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 shadow-xl font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-white text-[11px] uppercase tracking-wider">
              {isRtl
                ? 'سجل العمليات والمهام المؤتمتة الفورية (Live Background Daemons Terminal)'
                : 'Autonomous Automation Daemon Execution Logs'}
            </span>
          </div>
          <span className="text-slate-500 text-[10px]">
            {isRtl ? 'آخر تنفيذ: ' : 'Last Execution: '}{new Date(lastAutomationRun).toLocaleTimeString()}
          </span>
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto pr-2">
          {logs.map((log, i) => (
            <div key={i} className="text-slate-300 leading-relaxed text-[11px]">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
