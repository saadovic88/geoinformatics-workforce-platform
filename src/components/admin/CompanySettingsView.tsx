import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Building, Save, CheckCircle, Shield, Globe, Bell } from 'lucide-react';

export const CompanySettingsView: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const [companyNameEn, setCompanyNameEn] = useState('Geoinformatics GIS & Remote Sensing');
  const [companyNameAr, setCompanyNameAr] = useState('جيوانفورماتكس لنظم المعلومات الجغرافية والاستشعار عن بعد');
  const [defaultHours, setDefaultHours] = useState(8);
  const [defaultRadius, setDefaultRadius] = useState(500);
  const [dualSignatoryEnabled, setDualSignatoryEnabled] = useState(true);
  const [wfhEnabled, setWfhEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('navSettings')}</h1>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'إعدادات الشركة العامة وسياسات الحضور والسياج الجغرافي والاعتمادات الثنائية.'
              : 'Global corporate parameters, working schedules, and policy rules.'}
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{isRtl ? 'تم حفظ إعدادات الشركة بنجاح' : 'Company settings updated successfully.'}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6 text-xs text-slate-800">
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            {isRtl ? 'هوية الشركة وبيانات العلامة التجارية' : 'Company Identity & Branding'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1">
                {isRtl ? 'اسم الشركة بالإنجليزية' : 'Corporate Name (EN)'}
              </label>
              <input
                type="text"
                value={companyNameEn}
                onChange={(e) => setCompanyNameEn(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">
                {isRtl ? 'اسم الشركة بالعربية' : 'Corporate Name (AR)'}
              </label>
              <input
                type="text"
                value={companyNameAr}
                onChange={(e) => setCompanyNameAr(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            {isRtl ? 'معايير الحضور والنطاق الجغرافي' : 'Attendance & Geofencing Parameters'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1">
                {isRtl ? 'ساعات العمل الرسمية اليومية (ساعات)' : 'Standard Daily Work Hours (Hours)'}
              </label>
              <input
                type="number"
                value={defaultHours}
                onChange={(e) => setDefaultHours(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">
                {isRtl ? 'نصف قطر السياج الجغرافي المعتمد (أمتار)' : 'Geofence Validation Radius (Meters)'}
              </label>
              <input
                type="number"
                value={defaultRadius}
                onChange={(e) => setDefaultRadius(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            {isRtl ? 'قواعد الحوكمة والاعتماد الثنائي الإلزامي' : 'Governance & Dual Approval Rules'}
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={dualSignatoryEnabled}
                onChange={(e) => setDualSignatoryEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <div>
                <span className="font-bold text-slate-900 block">
                  {isRtl
                    ? 'تفعيل مسار الاعتماد الثنائي الإلزامي (م. محمد عمر و د. غادة)'
                    : 'Enforce Mandatory Dual Signatory (Eng. Mohamed Omar & Dr. Ghada)'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {isRtl
                    ? 'يشترط موافقة كلا المؤسسين. الرفض من أي طرف يلغي الطلب فوراً.'
                    : 'Requires concurrence from both founders. Either rejection immediately cancels request.'}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={wfhEnabled}
                onChange={(e) => setWfhEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <div>
                <span className="font-bold text-slate-900 block">
                  {isRtl
                    ? 'السماح باستثناءات العمل عن بُعد والمأموريات الميدانية'
                    : 'Allow Remote Work & External Field Site Exception Overrides'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {isRtl
                    ? 'الطلبات المعتمدة تلغي مخالفة الحضور خارج نطاق الـ 500 متر تلقائياً.'
                    : 'Approved WFH/Field requests suppress outside-zone geofence penalties.'}
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
