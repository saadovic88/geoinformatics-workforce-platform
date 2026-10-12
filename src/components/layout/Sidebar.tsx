import React, { useState } from 'react';
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
  X,
  ChevronDown,
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
  const { currentUser, hasPermission, isFullAccessUser } = useAuth();
  const { t, isRtl, language, setLanguage } = useLanguage();

  const isPlatformAdmin = isFullAccessUser;
  const canViewTeamOperations = isFullAccessUser;
  const canApproveLeave = isFullAccessUser || ['gis_manager', 'rs_manager'].includes(currentUser.roleId);
  const canViewPeopleDirectory = isPlatformAdmin;
  const canManageSettings = isPlatformAdmin;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const navGroups = [
    {
      titleEn: 'Dashboards',
      titleAr: 'لوحات القيادة',
      items: [
        { id: 'dashboard' as ActivePage, label: t('navDashboard'), icon: LayoutDashboard, show: true },
      ],
    },
    {
      titleEn: 'Workforce & Org',
      titleAr: 'الموظفون والهيكل',
      items: [
        { id: 'directory' as ActivePage, label: t('navEmployeeDir'), icon: Users, show: canViewPeopleDirectory },
        { id: 'orgchart' as ActivePage, label: t('navOrgChart'), icon: Network, show: canViewPeopleDirectory },
      ],
    },
    {
      titleEn: 'Attendance & GIS Zones',
      titleAr: 'الحضور والنطاقات الجغرافية',
      items: [
        { id: 'attendance_my' as ActivePage, label: t('navMyAttendance'), icon: Clock, show: true },
        { id: 'attendance_team' as ActivePage, label: t('navTeamAttendance'), icon: CalendarCheck, show: canViewTeamOperations },
        { id: 'geofence_settings' as ActivePage, label: t('navGeofenceSettings'), icon: MapPin, show: canManageSettings },
        { id: 'schedules' as ActivePage, label: t('navSchedules'), icon: Calendar, show: canManageSettings },
      ],
    },
    {
      titleEn: 'Tasks & GIS Projects',
      titleAr: 'المهام ومشاريع GIS',
      items: [
        { id: 'tasks_my' as ActivePage, label: t('navMyTasks'), icon: CheckSquare, show: true },
        { id: 'tasks_team' as ActivePage, label: t('navTeamTasks'), icon: ListTodo, show: canViewTeamOperations },
        { id: 'tasks_kanban' as ActivePage, label: t('navKanban'), icon: Kanban, show: true },
        { id: 'task_insights' as ActivePage, label: t('navTaskInsights'), icon: BarChart3, show: canViewTeamOperations },
      ],
    },
    {
      titleEn: 'Leaves & Dual Sign-off',
      titleAr: 'الإجازات والاعتماد الثنائي',
      items: [
        { id: 'leaves_requests' as ActivePage, label: t('navLeaveRequests'), icon: FileText, show: true },
        { id: 'leaves_balances' as ActivePage, label: t('navLeaveBalances'), icon: Wallet, show: true },
        { id: 'leaves_dual_approval' as ActivePage, label: t('navDualApproval'), icon: ShieldCheck, show: canApproveLeave },
        { id: 'leaves_wfh_field' as ActivePage, label: t('navWfhField'), icon: Send, show: currentUser.roleId !== 'gis_specialist' && currentUser.roleId !== 'rs_specialist' },
      ],
    },
    {
      titleEn: 'KPI & Performance',
      titleAr: 'تقييم الأداء KPI',
      items: [
        { id: 'kpi_my' as ActivePage, label: t('navMyKPI'), icon: Award, show: true },
        { id: 'kpi_team' as ActivePage, label: t('navTeamKPI'), icon: Sliders, show: isPlatformAdmin },
        { id: 'kpi_reports' as ActivePage, label: t('navKPIReports'), icon: TrendingUp, show: isPlatformAdmin },
      ],
    },
    {
      titleEn: 'Reports & Governance',
      titleAr: 'التقارير والإدارة النظامية',
      items: [
        { id: 'reports_center' as ActivePage, label: t('navReports'), icon: FileSpreadsheet, show: isPlatformAdmin },
        { id: 'roles_matrix' as ActivePage, label: t('navRolesPerms'), icon: Lock, show: isPlatformAdmin },
        { id: 'automations' as ActivePage, label: t('navAutomations'), icon: Cpu, show: isPlatformAdmin },
        { id: 'audit_logs' as ActivePage, label: t('navAuditLogs'), icon: History, show: isPlatformAdmin },
        { id: 'company_settings' as ActivePage, label: t('navSettings'), icon: Building, show: isPlatformAdmin },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 ${
          isRtl ? 'right-0' : 'left-0'
        } z-50 w-[min(22rem,calc(100vw-1rem))] bg-slate-900 text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 ease-out border-slate-800 lg:w-64 lg:shadow-none ${
          isRtl ? 'border-l' : 'border-r'
        } lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="min-h-16 p-4 border-b border-slate-800 flex items-center justify-between">
          <CompanyLogo size="sm" showText={true} textClassName="text-white [&_span.font-black]:text-white [&_span.text-blue-600]:text-blue-400" />
          {isOpenMobile && (
            <button onClick={onCloseMobile} className="grid h-11 w-11 place-items-center rounded-xl text-[0px] text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 lg:hidden" aria-label={isRtl ? 'إغلاق القائمة' : 'Close navigation'}>
              <X className="h-5 w-5" />
              ✕
            </button>
          )}
        </div>

        {/* Scrollable Nav Groups */}
        <nav aria-label={isRtl ? 'التنقل الرئيسي' : 'Main navigation'} className="flex-1 overflow-y-auto overscroll-contain p-3 pb-6 space-y-6">
          {navGroups.map((group, idx) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;
            const isExpanded = expandedGroups[group.titleEn] !== false;

            return (
              <div key={idx} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setExpandedGroups((previous) => ({ ...previous, [group.titleEn]: !isExpanded }))}
                  aria-expanded={isExpanded}
                  className="w-full min-h-8 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between rounded-lg hover:bg-slate-800 hover:text-slate-200 transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset"
                >
                  <span>{isRtl ? group.titleAr : group.titleEn}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                </button>
                {isExpanded && visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectPage(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`min-h-11 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset ${
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
        </nav>

        {/* Language Switcher + User Mini Card in Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2.5">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="min-h-11 w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400"
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
