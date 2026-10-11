import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Network,
  Clock,
  CalendarCheck,
  MapPin,
  Calendar,
  CheckSquare,
  ListTodo,
  Kanban,
  FileText,
  Wallet,
  ShieldCheck,
  Send,
  Award,
  Sliders,
  TrendingUp,
  FileSpreadsheet,
  Lock,
  Cpu,
  History,
  Building,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { CompanyLogo } from '../common/CompanyLogo';
import { UserAvatar } from '../common/UserAvatar';

export type ActivePage =
  | 'dashboard'
  | 'executive'
  | 'directory'
  | 'orgchart'
  | 'attendance_my'
  | 'attendance_team'
  | 'geofence_settings'
  | 'schedules'
  | 'tasks_my'
  | 'tasks_team'
  | 'tasks_kanban'
  | 'task_insights'
  | 'leaves_requests'
  | 'leaves_balances'
  | 'leaves_dual_approval'
  | 'leaves_wfh_field'
  | 'kpi_my'
  | 'kpi_team'
  | 'kpi_reports'
  | 'reports_center'
  | 'roles_matrix'
  | 'automations'
  | 'audit_logs'
  | 'company_settings';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser, hasPermission } = useAuth();
  const { t, isRtl, language, setLanguage } = useLanguage();

  const isExecutive = ['ceo', 'co_founder'].includes(currentUser.roleId);
  const isManager = currentUser.roleId.includes('manager') || isExecutive;

  const navGroups = [
    {
      titleEn: 'Dashboards',
      titleAr: 'لوحات القيادة',
      items: [
        { id: 'dashboard' as ActivePage, label: t('navDashboard'), icon: LayoutDashboard, show: true },
        { id: 'executive' as ActivePage, label: t('navExecutive'), icon: BarChart3, show: isExecutive || isManager },
      ],
    },
    {
      titleEn: 'Workforce & Org',
      titleAr: 'الموظفون والهيكل',
      items: [
        { id: 'directory' as ActivePage, label: t('navEmployeeDir'), icon: Users, show: true },
        { id: 'orgchart' as ActivePage, label: t('navOrgChart'), icon: Network, show: true },
      ],
    },
    {
      titleEn: 'Attendance & GIS Zones',
      titleAr: 'الحضور والنطاقات الجغرافية',
      items: [
        { id: 'attendance_my' as ActivePage, label: t('navMyAttendance'), icon: Clock, show: true },
        { id: 'attendance_team' as ActivePage, label: t('navTeamAttendance'), icon: CalendarCheck, show: isManager },
        { id: 'geofence_settings' as ActivePage, label: t('navGeofenceSettings'), icon: MapPin, show: true },
        { id: 'schedules' as ActivePage, label: t('navSchedules'), icon: Calendar, show: true },
      ],
    },
    {
      titleEn: 'Tasks & GIS Projects',
      titleAr: 'المهام ومشاريع GIS',
      items: [
        { id: 'tasks_my' as ActivePage, label: t('navMyTasks'), icon: CheckSquare, show: true },
        { id: 'tasks_team' as ActivePage, label: t('navTeamTasks'), icon: ListTodo, show: isManager },
        { id: 'tasks_kanban' as ActivePage, label: t('navKanban'), icon: Kanban, show: true },
        { id: 'task_insights' as ActivePage, label: t('navTaskInsights'), icon: BarChart3, show: isManager },
      ],
    },
    {
      titleEn: 'Leaves & Dual Sign-off',
      titleAr: 'الإجازات والاعتماد الثنائي',
      items: [
        { id: 'leaves_requests' as ActivePage, label: t('navLeaveRequests'), icon: FileText, show: true },
        { id: 'leaves_balances' as ActivePage, label: t('navLeaveBalances'), icon: Wallet, show: true },
        { id: 'leaves_dual_approval' as ActivePage, label: t('navDualApproval'), icon: ShieldCheck, show: true },
        { id: 'leaves_wfh_field' as ActivePage, label: t('navWfhField'), icon: Send, show: true },
      ],
    },
    {
      titleEn: 'KPI & Performance',
      titleAr: 'تقييم الأداء KPI',
      items: [
        { id: 'kpi_my' as ActivePage, label: t('navMyKPI'), icon: Award, show: true },
        { id: 'kpi_team' as ActivePage, label: t('navTeamKPI'), icon: Sliders, show: isManager },
        { id: 'kpi_reports' as ActivePage, label: t('navKPIReports'), icon: TrendingUp, show: true },
      ],
    },
    {
      titleEn: 'Reports & Governance',
      titleAr: 'التقارير والإدارة النظامية',
      items: [
        { id: 'reports_center' as ActivePage, label: t('navReports'), icon: FileSpreadsheet, show: true },
        { id: 'roles_matrix' as ActivePage, label: t('navRolesPerms'), icon: Lock, show: isExecutive || currentUser.roleId === 'admin_manager' },
        { id: 'automations' as ActivePage, label: t('navAutomations'), icon: Cpu, show: true },
        { id: 'audit_logs' as ActivePage, label: t('navAuditLogs'), icon: History, show: isExecutive || isManager },
        { id: 'company_settings' as ActivePage, label: t('navSettings'), icon: Building, show: isExecutive },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 ${
          isRtl ? 'right-0' : 'left-0'
        } z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-slate-800 ${
          isRtl ? 'border-l' : 'border-r'
        } lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <CompanyLogo size="sm" showText={true} textClassName="text-white [&_span.font-black]:text-white [&_span.text-blue-600]:text-blue-400" />
          {isOpenMobile && (
            <button onClick={onCloseMobile} className="text-slate-400 hover:text-white lg:hidden">
              ✕
            </button>
          )}
        </div>

        {/* Scrollable Nav Groups */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {navGroups.map((group, idx) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {isRtl ? group.titleAr : group.titleEn}
                </div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectPage(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition duration-150 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Language Switcher + User Mini Card in Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2.5">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-semibold transition"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>{isRtl ? 'لغة المنظومة' : 'Language'}</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-600/30 text-blue-300 font-bold">
              {language === 'en' ? 'العربية' : 'English'}
            </span>
          </button>

          <div className="flex items-center gap-2.5 pt-1">
            <UserAvatar
              src={currentUser.avatarUrl}
              name={isRtl ? currentUser.nameAr : currentUser.nameEn}
              size="sm"
              rounded="full"
              className="border-slate-700"
            />
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-white truncate">
                {isRtl ? currentUser.nameAr : currentUser.nameEn}
              </p>
              <p className="text-[10px] text-blue-400 truncate">
                {currentUser.employeeCode} • {isRtl ? currentUser.jobTitleAr : currentUser.jobTitleEn}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
