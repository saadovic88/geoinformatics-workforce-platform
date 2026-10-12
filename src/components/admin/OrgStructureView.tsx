import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Network } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

export const OrgStructureView: React.FC = () => {
  const { users } = useAuth();
  const { t, isRtl } = useLanguage();

  const ceo = users.find((u) => u.id === 'emp_badawy');
  const coFounders = users.filter((u) => ['emp_omar', 'emp_ghada'].includes(u.id));
  const managers = users.filter((u) =>
    ['emp_soghayar', 'emp_salama', 'emp_barghouth', 'emp_kyrillos', 'emp_sherif'].includes(u.id)
  );

  const rsTeam = users.filter((u) =>
    ['emp_ahmed_salah', 'emp_nassar_senior', 'emp_ahmed_badr'].includes(u.id)
  );

  const gisTeam = users.filter((u) =>
    ['emp_mostafa_nasser', 'emp_youssef_osama', 'emp_abdelrahman', 'emp_tammam', 'emp_mokhtar'].includes(u.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Network className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">{t('navOrgChart')}</h1>
        </div>
        <p className="text-xs text-slate-500">
          {isRtl
            ? 'الهيكل التنظيمي المعتمد لشركة جيوانفورماتكس شاملاً القيادة التنفيذية، مديري الإدارات، والمتخصصين (17 عضواً).'
            : 'Geoinformatics organizational hierarchy spanning Executive, Departmental, and GIS/RS specialist teams.'}
        </p>
      </div>

      {/* Org Tree */}
      <div className="space-y-8 flex flex-col items-center">
        {/* Tier 1: CEO */}
        {ceo && (
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-xl border border-blue-800 text-center max-w-xs w-full space-y-2">
              <UserAvatar
                src={ceo.avatarUrl}
                name={isRtl ? ceo.nameAr : ceo.nameEn}
                size="xl"
                rounded="full"
                className="border-2 border-white/40 mx-auto shadow-md"
              />
              <div>
                <h3 className="font-bold text-sm">{isRtl ? ceo.nameAr : ceo.nameEn}</h3>
                <span className="text-[11px] text-blue-300 font-semibold block">{isRtl ? ceo.jobTitleAr : ceo.jobTitleEn}</span>
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{ceo.employeeCode}</span>
              </div>
            </div>
            <div className="w-0.5 h-8 bg-slate-300"></div>
          </div>
        )}

        {/* Tier 2: Co-Founders & Executive Partners */}
        <div className="flex flex-col items-center w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl w-full">
            {coFounders.map((cf) => (
              <div
                key={cf.id}
                className="bg-white rounded-2xl p-4 border-2 border-blue-600/30 shadow-md text-center space-y-2 relative"
              >
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                  {isRtl ? 'معتمد ثنائي' : 'Dual Signatory'}
                </span>
                <UserAvatar
                  src={cf.avatarUrl}
                  name={isRtl ? cf.nameAr : cf.nameEn}
                  size="lg"
                  rounded="full"
                  className="border-2 border-blue-600 mx-auto"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{isRtl ? cf.nameAr : cf.nameEn}</h4>
                  <span className="text-[11px] text-blue-700 font-semibold block">{isRtl ? cf.jobTitleAr : cf.jobTitleEn}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{cf.employeeCode}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="w-0.5 h-8 bg-slate-300"></div>
        </div>

        {/* Tier 3: Department Managers */}
        <div className="flex flex-col items-center w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
            {managers.map((mgr) => (
              <div
                key={mgr.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-center space-y-2 hover:border-blue-400 transition"
              >
                <UserAvatar
                  src={mgr.avatarUrl}
                  name={isRtl ? mgr.nameAr : mgr.nameEn}
                  size="md"
                  rounded="full"
                  className="mx-auto"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs truncate">{isRtl ? mgr.nameAr : mgr.nameEn}</h4>
                  <span className="text-[10px] text-slate-500 font-semibold block truncate">
                    {isRtl ? mgr.jobTitleAr : mgr.jobTitleEn}
                  </span>
                  <span className="text-[9px] text-blue-600 uppercase font-mono block mt-0.5">
                    {mgr.departmentId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier 4: Specialist Teams */}
        <div className="w-full space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm text-center">
            {isRtl ? 'المتخصصون والفرق الفنية والميدانية' : 'Specialist & Operational Teams'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
            {/* GIS Team */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="font-bold text-blue-900 text-xs uppercase tracking-wider block">
                  {isRtl ? 'أخصائيو نظم المعلومات الجغرافية' : 'GIS Specialists'} ({gisTeam.length})
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {isRtl ? 'قسم GIS' : 'GIS Dept'}
                </span>
              </div>
              <div className="space-y-2">
                {gisTeam.map((sp) => (
                  <div key={sp.id} className="p-2.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between gap-2.5 hover:border-blue-300 transition">
                    <div className="flex items-center gap-2.5 truncate">
                      <UserAvatar
                        src={sp.avatarUrl}
                        name={isRtl ? sp.nameAr : sp.nameEn}
                        size="sm"
                        rounded="full"
                      />
                      <div className="truncate">
                        <span className="font-bold text-slate-800 text-xs block truncate">
                          {isRtl ? sp.nameAr : sp.nameEn}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {isRtl ? sp.jobTitleAr : sp.jobTitleEn}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-blue-700 font-mono font-bold shrink-0">{sp.employeeCode}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Remote Sensing Team */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="font-bold text-indigo-900 text-xs uppercase tracking-wider block">
                  {isRtl ? 'أخصائيو الاستشعار عن بُعد' : 'Remote Sensing Specialists'} ({rsTeam.length})
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {isRtl ? 'قسم الاستشعار' : 'RS Dept'}
                </span>
              </div>
              <div className="space-y-2">
                {rsTeam.map((sp) => (
                  <div key={sp.id} className="p-2.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between gap-2.5 hover:border-indigo-300 transition">
                    <div className="flex items-center gap-2.5 truncate">
                      <UserAvatar
                        src={sp.avatarUrl}
                        name={isRtl ? sp.nameAr : sp.nameEn}
                        size="sm"
                        rounded="full"
                      />
                      <div className="truncate">
                        <span className="font-bold text-slate-800 text-xs block truncate">
                          {isRtl ? sp.nameAr : sp.nameEn}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {isRtl ? sp.jobTitleAr : sp.jobTitleEn}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-700 font-mono font-bold shrink-0">{sp.employeeCode}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
