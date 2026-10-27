import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActivePage } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { WelcomeOverlay } from './components/auth/WelcomeOverlay';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';

const CheckOutSummaryModal = React.lazy(() => import('./components/attendance/CheckOutSummaryModal').then((module) => ({ default: module.CheckOutSummaryModal })));
const EmployeeDashboard = React.lazy(() => import('./components/dashboards/EmployeeDashboard').then((module) => ({ default: module.EmployeeDashboard })));
const ExecutiveDashboard = React.lazy(() => import('./components/dashboards/ExecutiveDashboard').then((module) => ({ default: module.ExecutiveDashboard })));
const EmployeeDirectory = React.lazy(() => import('./components/directory/EmployeeDirectory').then((module) => ({ default: module.EmployeeDirectory })));
const AttendanceDashboard = React.lazy(() => import('./components/attendance/AttendanceDashboard').then((module) => ({ default: module.AttendanceDashboard })));
const GeofenceSettingsView = React.lazy(() => import('./components/admin/GeofenceSettingsView').then((module) => ({ default: module.GeofenceSettingsView })));
const SchedulesHolidaysView = React.lazy(() => import('./components/admin/SchedulesHolidaysView').then((module) => ({ default: module.SchedulesHolidaysView })));
const TasksView = React.lazy(() => import('./components/tasks/TasksView').then((module) => ({ default: module.TasksView })));
const LeaveManagement = React.lazy(() => import('./components/leaves/LeaveManagement').then((module) => ({ default: module.LeaveManagement })));
const KPIDashboard = React.lazy(() => import('./components/kpi/KPIDashboard').then((module) => ({ default: module.KPIDashboard })));
const ReportsCenter = React.lazy(() => import('./components/reports/ReportsCenter').then((module) => ({ default: module.ReportsCenter })));
const RolesPermissionsView = React.lazy(() => import('./components/admin/RolesPermissionsView').then((module) => ({ default: module.RolesPermissionsView })));
const CompanySettingsView = React.lazy(() => import('./components/admin/CompanySettingsView').then((module) => ({ default: module.CompanySettingsView })));

const MainAppContent: React.FC = () => {
  const { isAuthenticated, pendingLogoutSummary, setPendingLogoutSummary, currentUser, isFullAccessUser, hasPermission, welcomeUser, dismissWelcome } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [manualCheckoutModal, setManualCheckoutModal] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<{ page: ActivePage; itemId?: string } | null>(null);
  const mainViewportRef = useRef<HTMLElement>(null);

  const handleNotificationAction = useCallback((actionUrl?: string) => {
    const [kind, itemId] = (actionUrl || '').split(':');
    const page: ActivePage = kind === 'task' || kind === 'tasks' ? 'tasks_my'
      : kind === 'leave' || kind === 'leaves' ? 'leaves_requests'
      : kind === 'attendance' ? 'attendance_my'
      : kind === 'kpi' ? 'kpi_my'
      : 'dashboard';
    setNotificationTarget({ page, itemId });
    setActivePage(page);
  }, []);

  // A system notification may launch a fresh PWA window or focus an existing
  // one. In both cases, navigate directly to the corresponding work item.
  useEffect(() => {
    const openedFromPush = new URLSearchParams(window.location.search).get('notification');
    if (openedFromPush) {
      handleNotificationAction(openedFromPush);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent<{ type?: string; actionUrl?: string }>) => {
      if (event.data?.type === 'OPEN_NOTIFICATION_ACTION') handleNotificationAction(event.data.actionUrl);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [handleNotificationAction]);

  // A navigation action should always reveal the new page header. Without this,
  // an administrator who navigates while scrolled down can appear to remain on
  // the previous page even though React has rendered the destination.
  useEffect(() => {
    mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const adminFallback = () => (
    <EmployeeDashboard
      onNavigate={(page) => setActivePage(page)}
      onOpenCheckOutModal={() => setManualCheckoutModal(true)}
      onRequestLeave={() => setActivePage('leaves_requests')}
      onCreateTask={() => setActivePage('tasks_kanban')}
    />
  );

  const canViewExecutiveMonitoring = isFullAccessUser || currentUser.roleId === 'co_founder';
  const canOpenDepartmentApproval = ['ceo', 'admin_manager', 'tech_manager', 'gis_manager', 'rs_manager', 'training_manager'].includes(currentUser.roleId);

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':
        if (canViewExecutiveMonitoring) {
          return <ExecutiveDashboard onNavigate={(page) => setActivePage(page)} />;
        }
        return (
          <EmployeeDashboard
            onNavigate={(page) => setActivePage(page)}
            onOpenCheckOutModal={() => setManualCheckoutModal(true)}
            onRequestLeave={() => setActivePage('leaves_requests')}
            onCreateTask={() => setActivePage('tasks_kanban')}
          />
        );
      case 'executive':
        return canViewExecutiveMonitoring ? <ExecutiveDashboard onNavigate={(page) => setActivePage(page)} /> : adminFallback();
      case 'directory':
        return canViewExecutiveMonitoring ? <EmployeeDirectory /> : <EmployeeDashboard
          onNavigate={(page) => setActivePage(page)}
          onOpenCheckOutModal={() => setManualCheckoutModal(true)}
          onRequestLeave={() => setActivePage('leaves_requests')}
          onCreateTask={() => setActivePage('tasks_kanban')}
        />;
      case 'attendance_my':
        return <AttendanceDashboard key={activePage} scope="my" />;
      case 'attendance_team':
        return canViewExecutiveMonitoring ? <AttendanceDashboard key={activePage} scope="team" /> : adminFallback();
      case 'geofence_settings':
        return isFullAccessUser ? <GeofenceSettingsView /> : adminFallback();
      case 'schedules':
        return isFullAccessUser ? <SchedulesHolidaysView /> : adminFallback();
      case 'tasks_my':
        return hasPermission('tasks', 'view') ? <TasksView key={`${activePage}-${notificationTarget?.itemId || ''}`} filterScope="my" initialViewMode="list" initialTaskId={notificationTarget?.itemId} /> : adminFallback();
      case 'tasks_team':
        return isFullAccessUser ? <TasksView key={activePage} filterScope="team" initialViewMode="kanban" /> : adminFallback();
      case 'tasks_kanban':
        return hasPermission('tasks', 'view') ? <TasksView key={activePage} initialViewMode="kanban" /> : adminFallback();
      case 'task_insights':
        return isFullAccessUser ? <TasksView key={activePage} filterScope="team" initialViewMode="insights" /> : adminFallback();
      case 'leaves_requests':
        return <LeaveManagement key={activePage} initialTab="requests" />;
      case 'leaves_balances':
        return <LeaveManagement key={activePage} initialTab="balances" />;
      case 'leaves_dual_approval':
        return canOpenDepartmentApproval ? <LeaveManagement key={activePage} initialTab="dual_approval" /> : adminFallback();
      case 'leaves_wfh_field':
        return <LeaveManagement key={activePage} initialTab="wfh_field" />;
      case 'kpi_my':
        return <KPIDashboard key={activePage} initialMode="my" />;
      case 'kpi_team':
        return canViewExecutiveMonitoring ? <KPIDashboard key={activePage} initialMode="team" /> : adminFallback();
      case 'kpi_reports':
        return canViewExecutiveMonitoring ? <KPIDashboard key={activePage} initialMode="reports" /> : adminFallback();
      case 'reports_center':
        return canViewExecutiveMonitoring ? <ReportsCenter key={activePage} /> : adminFallback();
      case 'audit_logs':
        return isFullAccessUser ? <ReportsCenter key={activePage} initialReport="audit" /> : adminFallback();
      case 'roles_matrix':
        return isFullAccessUser ? <RolesPermissionsView /> : adminFallback();
      case 'company_settings':
        return isFullAccessUser ? <CompanySettingsView /> : adminFallback();
      default:
        return (
          <EmployeeDashboard
            onNavigate={(page) => setActivePage(page)}
            onOpenCheckOutModal={() => setManualCheckoutModal(true)}
            onRequestLeave={() => setActivePage('leaves_requests')}
            onCreateTask={() => setActivePage('tasks_kanban')}
          />
        );
    }
  };

  return (
    <div className="platform-shell flex h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={(p) => setActivePage(p)}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          onOpenCheckOutModal={() => setManualCheckoutModal(true)}
          onNotificationAction={handleNotificationAction}
        />

        {/* Scrollable Viewport */}
        <main ref={mainViewportRef} className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <React.Suspense fallback={<div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">Loading…</div>}>
              {renderActiveView()}
            </React.Suspense>
          </div>
        </main>
      </div>

      {/* Daily Summary & Check-out Modal (Sign-out automated trigger) */}
      <React.Suspense fallback={null}>
        <CheckOutSummaryModal
          isOpen={pendingLogoutSummary}
          onClose={() => setPendingLogoutSummary(false)}
          isLogoutFlow={true}
        />

        {/* Manual Check-out Modal */}
        <CheckOutSummaryModal
          isOpen={manualCheckoutModal}
          onClose={() => setManualCheckoutModal(false)}
          isLogoutFlow={false}
        />
      </React.Suspense>
      {welcomeUser && <WelcomeOverlay user={welcomeUser} onContinue={dismissWelcome} />}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <MainAppContent />
            <PwaInstallPrompt />
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
