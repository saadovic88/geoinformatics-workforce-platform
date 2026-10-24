import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveBalance,
  Task,
  TaskStatus,
  MonthlyKPIRecord,
  GeofenceZone,
  WorkSchedule,
  Holiday,
  NotificationItem,
  AuditLogItem,
  User,
} from '../types';
import { dispatchPushNotification } from '../lib/pushNotifications';
import {
  INITIAL_ATTENDANCE,
  INITIAL_GEOFENCE_ZONES,
  INITIAL_HOLIDAYS,
  INITIAL_LEAVE_BALANCES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_MONTHLY_KPIS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TASKS,
  INITIAL_WORK_SCHEDULES,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS,
} from '../data/seedData';
import { evaluateGeofence, calculateHaversineDistanceMeters, getCurrentCoordinates } from '../utils/geoUtils';
import { canSubmitOwnLeave, getLeaveApprovers } from '../utils/leavePolicy';
import { buildTaskStageNotification, canTransitionTask, TASK_STAGE_META } from '../utils/taskWorkflow';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { formatTaskAttachmentSize, safeTaskAttachmentName, taskAttachmentKind, validateTaskAttachment } from '../utils/taskAttachments';

interface DataContextType {
  // Attendance
  attendanceRecords: AttendanceRecord[];
  todayAttendance: AttendanceRecord | undefined;
  checkIn: (coords?: { latitude: number; longitude: number }, forceStatus?: AttendanceStatus, notes?: string) => Promise<AttendanceRecord>;
  checkOut: (coords?: { latitude: number; longitude: number }) => Promise<AttendanceRecord | undefined>;
  resolveAttendanceException: (recordId: string, decision: 'approved' | 'rejected', notes?: string) => void;
  // Geofence & Schedules
  geofenceZones: GeofenceZone[];
  updateGeofenceZone: (zone: GeofenceZone) => void;
  addGeofenceZone: (zone: Omit<GeofenceZone, 'id'>) => void;
  deleteGeofenceZone: (zoneId: string) => boolean;
  workSchedules: WorkSchedule[];
  updateWorkSchedule: (schedule: WorkSchedule) => void;
  addWorkSchedule: (schedule: Omit<WorkSchedule, 'id'>) => void;
  deleteWorkSchedule: (scheduleId: string) => boolean;
  holidays: Holiday[];
  addHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  updateHoliday: (holiday: Holiday) => void;
  deleteHoliday: (holidayId: string) => void;
  // Leaves & Dual Approval
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  createLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status' | 'approvalSteps'>) => Promise<{ ok: boolean; message?: string }>;
  handleLeaveApproval: (requestId: string, approverId: string, decision: 'approved' | 'rejected', notes?: string) => void;
  cancelLeaveRequest: (requestId: string) => void;
  // Tasks
  tasks: Task[];
  createTask: (task: Omit<Task, 'id' | 'activityLogs' | 'comments'>) => Promise<{ ok: boolean; message?: string; taskId?: string }>;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus, note?: string) => Promise<{ ok: boolean; message?: string }>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<{ ok: boolean; message?: string }>;
  addTaskSubtask: (taskId: string, title: string) => void;
  addTaskAttachment: (taskId: string, name: string, url: string) => Promise<{ ok: boolean; message?: string }>;
  uploadTaskAttachment: (taskId: string, file: File) => Promise<{ ok: boolean; message?: string }>;
  getTaskAttachmentUrl: (attachment: Task['attachments'][number]) => Promise<{ ok: boolean; url?: string; message?: string }>;
  logTaskTime: (taskId: string, hours: number) => void;
  addTaskComment: (taskId: string, content: string) => Promise<{ ok: boolean; message?: string }>;
  reviewTask: (taskId: string, decision: 'approve' | 'revise', score?: number, notes?: string) => Promise<{ ok: boolean; message?: string }>;
  // KPI
  kpiRecords: MonthlyKPIRecord[];
  updateKPIRecord: (record: MonthlyKPIRecord) => void;
  // Notifications & Audit
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  auditLogs: AuditLogItem[];
  logAction: (action: string, module: string, details: string) => void;
  /** Pull the latest authorized company data immediately, without a full page reload. */
  refreshCompanyData: () => Promise<{ ok: boolean; message?: string }>;
  isSyncing: boolean;
  lastSyncedAt?: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, users, isFullAccessUser } = useAuth();
  const didRemapEmployeeIds = useRef(false);
  const pendingNotificationDeliveries = useRef<NotificationItem[]>([]);
  const [cloudReady, setCloudReady] = useState(() => !supabase);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();

  // Helper to migrate employee IDs from legacy seed data
  const mapLegacyId = (id: string): string => {
    const normalizedId = id === 'emp_ragab' ? 'emp_ghada'
      : id === 'emp_barfan' ? 'emp_salama'
      : id === 'emp_nassar' ? 'emp_nassar_senior'
      : id === 'emp_mostafa_nassar' ? 'emp_mostafa_nasser'
      : id === 'emp_youssef' ? 'emp_youssef_osama'
      : id;
    const seedUser = INITIAL_USERS.find((user) => user.id === normalizedId);
    return seedUser ? users.find((user) => user.employeeCode === seedUser.employeeCode)?.id || normalizedId : normalizedId;
  };

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('geo_attendance_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((r: AttendanceRecord) => r.employeeId !== 'emp_adel')
            .map((r: AttendanceRecord) => ({ ...r, employeeId: mapLegacyId(r.employeeId) }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_ATTENDANCE;
  });

  const [geofenceZones, setGeofenceZones] = useState<GeofenceZone[]>(() => {
    const saved = localStorage.getItem('geo_zones_data');
    return saved ? JSON.parse(saved) : INITIAL_GEOFENCE_ZONES;
  });

  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>(() => {
    const saved = localStorage.getItem('geo_schedules_data');
    return saved ? JSON.parse(saved) : INITIAL_WORK_SCHEDULES;
  });

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem('geo_holidays_data');
    return saved ? JSON.parse(saved) : INITIAL_HOLIDAYS;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('geo_leave_requests_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((r: LeaveRequest) => r.employeeId !== 'emp_adel')
            .map((r: LeaveRequest) => ({
              ...r,
              employeeId: mapLegacyId(r.employeeId),
              approvalSteps: r.approvalSteps,
            }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_LEAVE_REQUESTS;
  });

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(() => {
    const saved = localStorage.getItem('geo_leave_balances_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((b: LeaveBalance) => b.employeeId !== 'emp_adel')
            .map((b: LeaveBalance) => ({ ...b, employeeId: mapLegacyId(b.employeeId) }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_LEAVE_BALANCES;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('geo_tasks_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((t: Task) => ({
            ...t,
            creatorId: mapLegacyId(t.creatorId),
            assigneeIds: t.assigneeIds
              .filter((id) => id !== 'emp_adel')
              .map(mapLegacyId),
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_TASKS;
  });

  const [kpiRecords, setKpiRecords] = useState<MonthlyKPIRecord[]>(() => {
    const saved = localStorage.getItem('geo_kpi_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((k: MonthlyKPIRecord) => k.employeeId !== 'emp_adel')
            .map((k: MonthlyKPIRecord) => ({
              ...k,
              employeeId: mapLegacyId(k.employeeId),
              // Historical single-review records are retained as the CEO's
              // initial review. New records are scoped to their evaluator.
              evaluatorId: k.evaluatorId || (k.reviewedBy?.startsWith('emp_') ? k.reviewedBy : 'emp_badawy'),
            }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_MONTHLY_KPIS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('geo_notifs_data');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    const saved = localStorage.getItem('geo_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  type CloudKind = 'attendance' | 'zone' | 'schedule' | 'holiday' | 'leave_request' | 'leave_balance' | 'task' | 'kpi' | 'notification' | 'audit';
  type CloudDocument = { kind: CloudKind; document_id: string; owner_id: string | null; payload: unknown };
  const allCloudKinds: CloudKind[] = ['attendance', 'zone', 'schedule', 'holiday', 'leave_request', 'leave_balance', 'task', 'kpi', 'notification', 'audit'];
  const cloudSnapshots = useRef(new Map<CloudKind, Map<string, string>>());

  const createCloudSnapshots = (documents: CloudDocument[]) => {
    const snapshots = new Map<CloudKind, Map<string, string>>();
    allCloudKinds.forEach((kind) => snapshots.set(kind, new Map()));
    documents.forEach((document) => snapshots.get(document.kind)?.set(document.document_id, JSON.stringify(document.payload)));
    return snapshots;
  };

  const changedCloudKinds = (nextSnapshots: Map<CloudKind, Map<string, string>>) => allCloudKinds.filter((kind) => {
    const previous = cloudSnapshots.current.get(kind) || new Map<string, string>();
    const next = nextSnapshots.get(kind) || new Map<string, string>();
    if (previous.size !== next.size) return true;
    return [...next].some(([id, payload]) => previous.get(id) !== payload);
  });

  const rememberCloudDocuments = (documents: CloudDocument[], replaceKinds = true) => {
    const kinds = new Set(documents.map((document) => document.kind));
    if (replaceKinds) kinds.forEach((kind) => cloudSnapshots.current.set(kind, new Map()));
    documents.forEach((document) => {
      const byId = cloudSnapshots.current.get(document.kind) || new Map<string, string>();
      byId.set(document.document_id, JSON.stringify(document.payload));
      cloudSnapshots.current.set(document.kind, byId);
    });
  };

  const persistDocuments = (kind: CloudKind, documents: Array<{ id: string; ownerId: string | null; payload: unknown }>) => {
    if (!supabase || !cloudReady || !documents.length) return;
    const snapshot = cloudSnapshots.current.get(kind);
    const changed = documents.filter((document) => snapshot?.get(document.id) !== JSON.stringify(document.payload));
    if (!changed.length) return;
    void supabase.from('company_data_documents').upsert(
      changed.map((document) => ({ kind, document_id: document.id, owner_id: document.ownerId, payload: document.payload })),
      { onConflict: 'kind,document_id' }
    ).then(({ error }) => {
      if (error) console.error(`Could not persist ${kind} documents to Supabase`, error.message);
      else rememberCloudDocuments(changed.map((document) => ({ kind, document_id: document.id, owner_id: document.ownerId, payload: document.payload })), false);
    });
  };

  const persistDocumentNow = async (kind: CloudKind, document: { id: string; ownerId: string | null; payload: unknown }) => {
    if (!supabase) return { ok: true };
    if (!cloudReady) return { ok: false, message: 'Company data is still loading. Please try again in a moment.' };
    const { error } = await supabase.from('company_data_documents').upsert(
      { kind, document_id: document.id, owner_id: document.ownerId, payload: document.payload },
      { onConflict: 'kind,document_id' }
    );
    if (error) return { ok: false, message: error.message };
    rememberCloudDocuments([{ kind, document_id: document.id, owner_id: document.ownerId, payload: document.payload }], false);
    return { ok: true };
  };

  const retryPendingNotificationDeliveries = async () => {
    const pending = [...pendingNotificationDeliveries.current];
    if (!pending.length) return;
    const results = await Promise.all(pending.map(async (notification) => ({
      notification,
      result: await persistDocumentNow('notification', {
        id: notification.id,
        ownerId: notification.userId === 'all' ? null : notification.userId,
        payload: notification,
      }),
    })));
    pendingNotificationDeliveries.current = results
      .filter(({ result }) => !result.ok)
      .map(({ notification }) => notification);
    results.filter(({ result }) => result.ok).forEach(({ notification }) => dispatchPushNotification(notification));
  };

  const refreshCompanyData = async (): Promise<{ ok: boolean; message?: string }> => {
    if (!supabase || !currentUser?.id) return { ok: true };
    setIsSyncing(true);
    const { data, error } = await supabase
      .from('company_data_documents')
      .select('kind, document_id, owner_id, payload');
    setIsSyncing(false);
    if (error) {
      console.error('Could not refresh central company data from Supabase', error.message);
      setCloudReady(true);
      return { ok: false, message: error.message };
    }
    const docs = (data || []) as CloudDocument[];
    allCloudKinds.forEach((kind) => cloudSnapshots.current.set(kind, new Map()));
    rememberCloudDocuments(docs);
    const byKind = (kind: CloudKind) => docs.filter((document) => document.kind === kind).map((document) => document.payload);
    const shouldHydrate = docs.length > 0 || !isFullAccessUser;
    if (shouldHydrate) {
      setAttendanceRecords(byKind('attendance') as AttendanceRecord[]);
      setGeofenceZones(byKind('zone') as GeofenceZone[]);
      setWorkSchedules(byKind('schedule') as WorkSchedule[]);
      setHolidays(byKind('holiday') as Holiday[]);
      setLeaveRequests(byKind('leave_request') as LeaveRequest[]);
      setLeaveBalances(byKind('leave_balance') as LeaveBalance[]);
      setTasks(byKind('task') as Task[]);
      setKpiRecords(byKind('kpi') as MonthlyKPIRecord[]);
      setNotifications(byKind('notification') as NotificationItem[]);
      setAuditLogs(byKind('audit') as AuditLogItem[]);
    }
    setCloudReady(true);
    setLastSyncedAt(new Date().toISOString());
    await retryPendingNotificationDeliveries();
    return { ok: true };
  };

  // Supabase is the source of truth whenever configured. Browser storage is
  // retained strictly as an offline cache, never as the only company record.
  useEffect(() => {
    if (!supabase || !currentUser?.id) return;
    setCloudReady(false);
    void refreshCompanyData();
  }, [currentUser?.id, isFullAccessUser]);

  // Every authorised company update is reflected across open devices. Realtime
  // is the fast path; a recovery poll covers projects where the publication has
  // not yet been enabled or a laptop has briefly lost its socket.
  useEffect(() => {
    if (!supabase || !currentUser?.id || !cloudReady) return;
    const client = supabase;
    let cancelled = false;
    let refreshTimer: number | undefined;
    const refreshOperationalInbox = async () => {
      const { data, error } = await client
        .from('company_data_documents')
        .select('kind, document_id, owner_id, payload')
        ;
      if (cancelled || error || !data) return;
      const documents = data as CloudDocument[];
      const nextSnapshots = createCloudSnapshots(documents);
      const changed = changedCloudKinds(nextSnapshots);
      // The recovery poll normally finds no changes. Avoid filtering every
      // collection, JSON-stringifying state, and scheduling ten React updates
      // in that common case.
      if (!changed.length) {
        setLastSyncedAt(new Date().toISOString());
        return;
      }
      cloudSnapshots.current = nextSnapshots;
      const byKind = new Map<CloudKind, unknown[]>();
      allCloudKinds.forEach((kind) => byKind.set(kind, []));
      documents.forEach((document) => byKind.get(document.kind)?.push(document.payload));
      const payloads = (kind: CloudKind) => byKind.get(kind) || [];
      if (changed.includes('leave_request')) setLeaveRequests(payloads('leave_request') as LeaveRequest[]);
      if (changed.includes('task')) setTasks(payloads('task') as Task[]);
      if (changed.includes('notification')) setNotifications(payloads('notification') as NotificationItem[]);
      if (changed.includes('attendance')) setAttendanceRecords(payloads('attendance') as AttendanceRecord[]);
      if (changed.includes('zone')) setGeofenceZones(payloads('zone') as GeofenceZone[]);
      if (changed.includes('schedule')) setWorkSchedules(payloads('schedule') as WorkSchedule[]);
      if (changed.includes('holiday')) setHolidays(payloads('holiday') as Holiday[]);
      if (changed.includes('leave_balance')) setLeaveBalances(payloads('leave_balance') as LeaveBalance[]);
      if (changed.includes('kpi')) setKpiRecords(payloads('kpi') as MonthlyKPIRecord[]);
      if (changed.includes('audit')) setAuditLogs(payloads('audit') as AuditLogItem[]);
      setLastSyncedAt(new Date().toISOString());
    };
    const channel = client
      .channel(`company-data-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_data_documents' }, () => {
        // Several documents can change in one workflow; coalesce their events
        // into one RLS-scoped refresh instead of causing a request storm.
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => { void refreshOperationalInbox(); }, 180);
      })
      .subscribe();
    // Realtime delivers normal updates immediately. The poll is only a safety
    // net for a missed socket event, so keep it light and do no work in a
    // background tab.
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshOperationalInbox();
    }, 90000);
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') void refreshOperationalInbox();
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshOnReturn);
      void client.removeChannel(channel);
    };
  }, [currentUser?.id, cloudReady]);

  // Seed data predates Supabase and references legacy employee IDs. Once the
  // real directory arrives, align every relation with the Auth/Profile UUID so
  // dashboards, tasks, leaves and KPI views remain populated after login.
  useEffect(() => {
    if (!users.length || didRemapEmployeeIds.current) return;
    didRemapEmployeeIds.current = true;
    setAttendanceRecords((prev) => prev.map((record) => ({ ...record, employeeId: mapLegacyId(record.employeeId), reviewedBy: record.reviewedBy ? mapLegacyId(record.reviewedBy) : undefined })));
    setLeaveBalances((prev) => prev.map((balance) => ({ ...balance, employeeId: mapLegacyId(balance.employeeId) })));
    setLeaveRequests((prev) => prev.flatMap((request) => {
      const employeeId = mapLegacyId(request.employeeId);
      const requester = users.find((user) => user.id === employeeId);
      // Remove legacy requests for leave-exempt leaders and observers. They
      // were seeded under the old dual-signature workflow and are not valid
      // under the department-owned policy.
      if (!canSubmitOwnLeave(requester)) return [];
      const approvers = getLeaveApprovers(requester, users);
      if (!approvers.length) return [];
      const normalizedStepStatus = request.status === 'approved'
        ? 'approved' as const
        : request.status === 'rejected'
        ? 'rejected' as const
        : 'pending' as const;
      return [{
        ...request,
        employeeId,
        approvalSteps: approvers.map((approver) => ({
          approverId: approver.id,
          approverName: approver.nameEn,
          status: normalizedStepStatus,
        })),
      }];
    }));
    setTasks((prev) => prev.map((task) => ({
      ...task,
      creatorId: mapLegacyId(task.creatorId),
      assigneeIds: task.assigneeIds.map(mapLegacyId),
      comments: task.comments.map((comment) => ({ ...comment, userId: mapLegacyId(comment.userId) })),
      activityLogs: task.activityLogs.map((log) => ({ ...log, userId: mapLegacyId(log.userId) })),
    })));
    setKpiRecords((prev) => prev.map((record) => ({
      ...record,
      employeeId: mapLegacyId(record.employeeId),
      evaluatorId: record.evaluatorId ? mapLegacyId(record.evaluatorId) : record.evaluatorId,
      reviewedBy: record.reviewedBy ? mapLegacyId(record.reviewedBy) : undefined,
    })));
    setNotifications((prev) => prev.map((notification) => ({ ...notification, userId: notification.userId === 'all' ? 'all' : mapLegacyId(notification.userId) })));
    setAuditLogs((prev) => prev.map((log) => ({ ...log, userId: mapLegacyId(log.userId) })));
  }, [users]);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('geo_attendance_data', JSON.stringify(attendanceRecords));
    persistDocuments('attendance', attendanceRecords.map((record) => ({ id: record.id, ownerId: record.employeeId, payload: record })));
  }, [attendanceRecords, cloudReady]);

  useEffect(() => {
    localStorage.setItem('geo_zones_data', JSON.stringify(geofenceZones));
    persistDocuments('zone', geofenceZones.map((zone) => ({ id: zone.id, ownerId: null, payload: zone })));
  }, [geofenceZones, cloudReady]);

  useEffect(() => {
    localStorage.setItem('geo_schedules_data', JSON.stringify(workSchedules));
    persistDocuments('schedule', workSchedules.map((schedule) => ({ id: schedule.id, ownerId: null, payload: schedule })));
  }, [workSchedules, cloudReady]);

  useEffect(() => {
    localStorage.setItem('geo_holidays_data', JSON.stringify(holidays));
    persistDocuments('holiday', holidays.map((holiday) => ({ id: holiday.id, ownerId: null, payload: holiday })));
  }, [holidays, cloudReady]);

  useEffect(() => {
    localStorage.setItem('geo_leave_requests_data', JSON.stringify(leaveRequests));
    persistDocuments('leave_request', leaveRequests.map((request) => ({ id: request.id, ownerId: request.employeeId, payload: request })));
  }, [leaveRequests, cloudReady]);

  useEffect(() => {
    localStorage.setItem('geo_leave_balances_data', JSON.stringify(leaveBalances));
    persistDocuments('leave_balance', leaveBalances.map((balance) => ({ id: `${balance.employeeId}_${balance.leaveType}`, ownerId: balance.employeeId, payload: balance })));
  }, [leaveBalances, cloudReady]);

  useEffect(() => {
    localStorage.setItem('geo_tasks_data', JSON.stringify(tasks));
    persistDocuments('task', tasks.map((task) => ({ id: task.id, ownerId: task.creatorId, payload: task })));
  }, [tasks, cloudReady]);

  useEffect(() => {
    localStorage.setItem('geo_kpi_data', JSON.stringify(kpiRecords));
    persistDocuments('kpi', kpiRecords.map((record) => ({ id: record.id, ownerId: record.employeeId, payload: record })));
  }, [kpiRecords, cloudReady]);

  useEffect(() => {
    localStorage.setItem('geo_notifs_data', JSON.stringify(notifications));
    // Reading a notification is private. New cross-user notifications are
    // written immediately by addNotification instead of being re-upserted by
    // the sender during this background sync.
    persistDocuments('notification', notifications
      .filter((notification) => notification.userId === currentUser?.id || notification.userId === 'all')
      .map((notification) => ({ id: notification.id, ownerId: notification.userId === 'all' ? null : notification.userId, payload: notification })));
  }, [notifications, cloudReady, currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('geo_audit_logs', JSON.stringify(auditLogs));
    persistDocuments('audit', auditLogs.map((log) => ({ id: log.id, ownerId: log.userId === 'system' ? null : log.userId, payload: log })));
  }, [auditLogs, cloudReady]);

  const logAction = (action: string, module: string, details: string) => {
    const newLog: AuditLogItem = {
      id: `aud_${Date.now()}`,
      userId: currentUser?.id || 'system',
      userName: currentUser?.nameEn || 'System Automated Job',
      action,
      module,
      details,
      ipAddress: 'Not captured by client',
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addNotification = async (notif: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => {
    const newItem: NotificationItem = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
      createdBy: currentUser?.id,
    };
    setNotifications((prev) => [newItem, ...prev]);
    // This immediate write is what delivers the alert to another signed-in
    // employee; browser storage alone cannot cross devices or accounts.
    const rpcResult = supabase && newItem.userId !== 'all'
      ? await supabase.rpc('create_company_notification', { notification_payload: newItem })
      : { error: null };
    const result = rpcResult.error
      ? { ok: false, message: rpcResult.error.message }
      : supabase && newItem.userId !== 'all'
      ? { ok: true }
      : await persistDocumentNow('notification', {
          id: newItem.id,
          ownerId: newItem.userId === 'all' ? null : newItem.userId,
          payload: newItem,
        });
    if (result.ok && supabase && newItem.userId !== 'all') {
      rememberCloudDocuments([{ kind: 'notification', document_id: newItem.id, owner_id: newItem.userId, payload: newItem }]);
    }
    if (!result.ok) {
      console.error('Could not deliver notification', result.message);
      pendingNotificationDeliveries.current = [...pendingNotificationDeliveries.current.filter((item) => item.id !== newItem.id), newItem];
      return result;
    }
    dispatchPushNotification(newItem);
    return result;
  };

  // Use the company's local calendar day. UTC dates can otherwise create a
  // second attendance session around midnight in Cairo.
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const todayAttendance = attendanceRecords.find(
    (r) => r.employeeId === currentUser?.id && r.date === todayStr
  );

  // Auto check-in trigger when user logs in if not checked in today
  useEffect(() => {
    if (!currentUser || !cloudReady || currentUser.roleId === 'co_founder') return;
    const existing = attendanceRecords.find(
      (r) => r.employeeId === currentUser.id && r.date === todayStr
    );
    if (!existing) {
      // Auto check-in
      checkIn();
    }
  }, [currentUser?.id, todayStr, cloudReady]);

  // Check In Implementation
  const checkIn = async (
    coords?: { latitude: number; longitude: number },
    forceStatus?: AttendanceStatus,
    notes?: string
  ): Promise<AttendanceRecord> => {
    // One attendance clock is allowed per employee per workday. Re-clicking a
    // check-in control must never reset a running clock or reopen a completed
    // workday.
    const existing = attendanceRecords.find(
      (record) => record.employeeId === currentUser?.id && record.date === todayStr
    );
    if (existing) return existing;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Never manufacture an office location. Automatic and manual check-in both
    // request the device position; unavailable location is routed for review.
    let verifiedCoordinates = coords;
    let locationError = '';
    if (!verifiedCoordinates) {
      try {
        verifiedCoordinates = await getCurrentCoordinates();
      } catch (error) {
        locationError = error instanceof Error ? error.message : 'Location could not be verified.';
      }
    }
    const geofenceResult = verifiedCoordinates
      ? evaluateGeofence(verifiedCoordinates.latitude, verifiedCoordinates.longitude, geofenceZones)
      : {
          isInside: false,
          distanceMeters: undefined,
          nearestZone: geofenceZones.find((zone) => zone.isPrimary) || geofenceZones[0],
        };

    // Check if there is an approved WFH or external site leave for current user today
    const activeApprovedLeave = leaveRequests.find(
      (lr) =>
        lr.employeeId === currentUser?.id &&
        lr.status === 'approved' &&
        lr.startDate <= todayStr &&
        lr.endDate >= todayStr
    );

    let status: AttendanceStatus = 'present_inside';
    let statusNotes = notes || '';

    if (forceStatus) {
      status = forceStatus;
    } else if (activeApprovedLeave) {
      if (activeApprovedLeave.leaveType === 'wfh') {
        status = 'remote_approved';
        statusNotes = 'Approved Work From Home - Outside geofence permitted';
      } else if (activeApprovedLeave.leaveType === 'external_site') {
        status = 'external_approved';
        statusNotes = `Approved External Site (${activeApprovedLeave.externalSiteDetails?.projectName || 'Field Task'})`;
      } else {
        status = 'on_leave';
        statusNotes = 'Approved Leave';
      }
    } else if (!verifiedCoordinates) {
      status = 'outside_review';
      statusNotes = `Location unavailable. Attendance requires manager review. ${locationError}`.trim();
    } else if (!geofenceResult.isInside) {
      status = 'outside_review';
      statusNotes = `Outside company geofence zone (${geofenceResult.distanceMeters}m from ${geofenceResult.nearestZone.nameEn}). Requires review.`;
      // Notify HR / Admins
      addNotification({
        userId: 'emp_soghayar',
        titleEn: 'Outside Zone Attendance Notice',
        titleAr: 'تنبيه حضور خارج النطاق الجغرافي',
        messageEn: `${currentUser?.nameEn} checked in from outside the 500m company geofence (${geofenceResult.distanceMeters}m away).`,
        messageAr: `سجل ${currentUser?.nameAr} حضوراً خارج نطاق الـ 500 متر المعتمد للشركة (${geofenceResult.distanceMeters} متر).`,
        type: 'geofence',
        priority: 'high',
        actionUrl: 'attendance',
      });
    } else {
      // Inside zone. Check for late arrival (official start: 09:00 with 15m grace -> late after 09:15)
      const totalMins = hours * 60 + minutes;
      const officialStartMins = 9 * 60 + 15; // 09:15
      if (totalMins > officialStartMins) {
        status = 'late';
        statusNotes = `Arrived after grace period (${totalMins - 9 * 60}m past 09:00).`;
      } else {
        status = 'present_inside';
        statusNotes = 'Present within company geofence zone.';
      }
    }

    const lateMinutes = Math.max(0, hours * 60 + minutes - (9 * 60 + 15));

    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${currentUser?.id}`,
      employeeId: currentUser?.id || 'unknown',
      date: todayStr,
      checkInTime: timeStr,
      checkInLatitude: verifiedCoordinates?.latitude,
      checkInLongitude: verifiedCoordinates?.longitude,
      distanceMeters: geofenceResult.distanceMeters,
      status,
      statusNotes,
      totalDurationMinutes: 0,
      breakDurationMinutes: 0,
      netWorkedHours: 0,
      requiredDailyHours: 8,
      regularHours: 0,
      overtimeHours: 0,
      lateMinutes,
      earlyLeaveMinutes: 0,
      source: 'auto_login',
      reviewStatus: status === 'outside_review' ? 'pending' : undefined,
    };

    // Persist synchronously as well as through the normal state effect. This
    // protects an automatic check-in if the browser/device is closed straight
    // after opening the platform.
    const nextRecords = [
      newRecord,
      ...attendanceRecords.filter((r) => !(r.employeeId === currentUser?.id && r.date === todayStr)),
    ];
    setAttendanceRecords(nextRecords);
    localStorage.setItem('geo_attendance_data', JSON.stringify(nextRecords));

    logAction('CHECK_IN', 'Attendance', `${currentUser?.nameEn} checked in. Status: ${status}, Distance: ${geofenceResult.distanceMeters ?? 'unavailable'}m`);
    return newRecord;
  };

  // Check Out Implementation
  const checkOut = async (coords?: { latitude: number; longitude: number }): Promise<AttendanceRecord | undefined> => {
    if (!currentUser) return undefined;
    const existing = attendanceRecords.find(
      (r) => r.employeeId === currentUser.id && r.date === todayStr
    );
    if (!existing || existing.checkOutTime) {
      return existing;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const [inHours, inMins] = existing.checkInTime.split(':').map(Number);
    const outHours = now.getHours();
    const outMins = now.getMinutes();

    const inTotalMins = inHours * 60 + inMins;
    const outTotalMins = outHours * 60 + outMins;
    const sessionDurationMins = Math.max(1, outTotalMins - inTotalMins);

    // Break duration: standard 60 mins if worked > 5 hours, else 0
    const breakMins = sessionDurationMins > 300 ? 60 : 0;
    const netMins = Math.max(0, sessionDurationMins - breakMins);
    const netWorkedHours = parseFloat((netMins / 60).toFixed(2));

    const requiredDailyHours = existing.requiredDailyHours || 8;
    const regularHours = parseFloat(Math.min(netWorkedHours, requiredDailyHours).toFixed(2));
    const overtimeHours = parseFloat(Math.max(0, netWorkedHours - requiredDailyHours).toFixed(2));

    // Early departure calculation: official end 17:00 (17*60 = 1020)
    const officialEndMins = 17 * 60;
    const earlyLeaveMinutes = Math.max(0, officialEndMins - outTotalMins);

    const updated: AttendanceRecord = {
      ...existing,
      checkOutTime: timeStr,
      checkOutLatitude: coords?.latitude,
      checkOutLongitude: coords?.longitude,
      totalDurationMinutes: sessionDurationMins,
      breakDurationMinutes: breakMins,
      netWorkedHours,
      regularHours,
      overtimeHours,
      earlyLeaveMinutes,
    };

    const nextRecords = attendanceRecords.map((r) => (r.id === updated.id ? updated : r));
    setAttendanceRecords(nextRecords);
    localStorage.setItem('geo_attendance_data', JSON.stringify(nextRecords));

    logAction(
      'CHECK_OUT',
      'Attendance',
      `${currentUser.nameEn} checked out. Worked: ${netWorkedHours}h, Regular: ${regularHours}h, Overtime: ${overtimeHours}h`
    );

    return updated;
  };

  const resolveAttendanceException = (recordId: string, decision: 'approved' | 'rejected', notes?: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          reviewStatus: decision,
          status: decision === 'approved' ? 'outside_exception' : 'absent',
          reviewedBy: currentUser?.nameEn,
          reviewNotes: notes || (decision === 'approved' ? 'Exception authorized by HR' : 'Outside zone rejected; marked absent'),
        };
      })
    );
    logAction('ATTENDANCE_EXCEPTION_RESOLVED', 'Attendance', `Record ${recordId} was ${decision} by ${currentUser?.nameEn}`);
  };

  // The approver route is resolved by Supabase. This gives a regular employee
  // the correct signatories without granting access to private staff profiles.
  const createLeaveRequest = async (req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status' | 'approvalSteps'>) => {
    if (!currentUser || req.employeeId !== currentUser.id || !canSubmitOwnLeave(currentUser)) {
      return { ok: false, message: 'You are not allowed to submit this request.' };
    }
    const requester = users.find((user) => user.id === req.employeeId) || currentUser;
    let approvers = getLeaveApprovers(requester, users).map((user) => ({ id: user.id, nameEn: user.nameEn }));
    if (supabase) {
      const { data, error } = await supabase.rpc('get_leave_approvers_for_current_user');
      if (!error && Array.isArray(data)) {
        approvers = data.map((approver) => ({ id: approver.id as string, nameEn: approver.name_en as string }));
      } else if (!approvers.length) {
        return { ok: false, message: error?.message || 'Could not load the approval route.' };
      }
    }
    if (!approvers.length || !req.proxyEmployeeId || req.proxyEmployeeId === requester.id) {
      return { ok: false, message: 'Select a valid colleague and wait for the approval route to load.' };
    }

    const newRequest: LeaveRequest = {
      ...req,
      id: `lr_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending_approval',
      approvalSteps: approvers.map((approver) => ({ approverId: approver.id, approverName: approver.nameEn, status: 'pending' })),
    };
    const persisted = await persistDocumentNow('leave_request', { id: newRequest.id, ownerId: requester.id, payload: newRequest });
    if (!persisted.ok) return persisted;

    setLeaveRequests((prev) => [newRequest, ...prev]);
    setLeaveBalances((prev) => prev.map((balance) =>
      balance.employeeId === req.employeeId && balance.leaveType === req.leaveType
        ? { ...balance, pending: balance.pending + req.durationUnits }
        : balance
    ));

    approvers.forEach((approver) => addNotification({
      userId: approver.id,
      titleEn: 'Leave Request Awaiting Your Approval',
      titleAr: 'طلب إجازة جديد بانتظار اعتمادكم',
      messageEn: `${requester.nameEn} submitted a ${req.leaveType} request (${req.durationUnits} ${req.unit}).`,
      messageAr: `تم تقديم طلب ${req.leaveType} لمدة ${req.durationUnits} ${req.unit} وبانتظار اعتمادكم.`,
      type: 'leave', priority: 'high', actionUrl: `leave:${newRequest.id}`,
    }));
    addNotification({
      userId: req.proxyEmployeeId,
      titleEn: 'Leave Cover Assignment',
      titleAr: 'تكليف بتغطية مهام زميل',
      messageEn: `${requester.nameEn} nominated you to cover assigned work during ${req.startDate} to ${req.endDate}. This is an assignment notice; no response is required.`,
      messageAr: `تم تكليفك بتغطية مهام ${requester.nameAr} خلال الفترة من ${req.startDate} إلى ${req.endDate}. هذا إشعار تكليف ولا يتطلب منك قبولاً أو رفضاً.`,
      type: 'leave', priority: 'high', actionUrl: 'tasks_my',
    });
    logAction('LEAVE_REQUESTED', 'Leaves', `Request for ${req.durationUnits} ${req.unit} of ${req.leaveType} created`);
    return { ok: true };
  };

  const handleLeaveApproval = (
    requestId: string,
    approverId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ) => {
    const target = leaveRequests.find((r) => r.id === requestId);
    if (!target) return;
    // An approver may act only as themselves, and only on the one step routed
    // to them. Full platform access does not bypass leave ownership.
    if (!currentUser || currentUser.id !== approverId) return;
    if (!target.approvalSteps.some((step) => step.approverId === approverId)) return;

    // A signatory may reverse a prior rejection (or an approval). The request
    // status is recomputed from every individual decision, not treated as an
    // irreversible one-way state.
    const updatedSteps = target.approvalSteps.map((step) =>
      step.approverId === approverId
        ? { ...step, status: decision, actionDate: new Date().toISOString(), notes }
        : step
    );
    const nextStatus = updatedSteps.every((step) => step.status === 'approved')
      ? 'approved'
      : updatedSteps.some((step) => step.status === 'rejected')
      ? 'rejected'
      : updatedSteps.some((step) => step.status === 'approved')
      ? 'partially_approved'
      : 'pending_approval';
    const wasApproved = target.status === 'approved';
    const isApproved = nextStatus === 'approved';

    setLeaveRequests((prev) => prev.map((request) =>
      request.id === requestId ? { ...request, status: nextStatus, approvalSteps: updatedSteps } : request
    ));

    if (wasApproved !== isApproved || (target.status !== 'rejected' && nextStatus === 'rejected') || (target.status === 'rejected' && nextStatus !== 'rejected')) {
      setLeaveBalances((prev) => prev.map((balance) => {
        if (balance.employeeId !== target.employeeId || balance.leaveType !== target.leaveType) return balance;
        if (!wasApproved && isApproved) return { ...balance, pending: Math.max(0, balance.pending - target.durationUnits), used: balance.used + target.durationUnits, remaining: Math.max(0, balance.remaining - target.durationUnits) };
        if (wasApproved && !isApproved) return { ...balance, used: Math.max(0, balance.used - target.durationUnits), remaining: balance.remaining + target.durationUnits, pending: nextStatus === 'rejected' ? balance.pending : balance.pending + target.durationUnits };
        if (target.status !== 'rejected' && nextStatus === 'rejected') return { ...balance, pending: Math.max(0, balance.pending - target.durationUnits) };
        if (target.status === 'rejected' && nextStatus !== 'rejected') return { ...balance, pending: balance.pending + target.durationUnits };
        return balance;
      }));
    }

    addNotification({
      userId: target.employeeId,
      titleEn: isApproved ? 'Leave Request Fully Approved' : nextStatus === 'rejected' ? 'Leave Request Rejected' : 'Leave Approval Updated',
      titleAr: isApproved ? 'تم اعتماد طلب الإجازة نهائياً' : nextStatus === 'rejected' ? 'تم رفض طلب الإجازة' : 'تم تحديث قرار اعتماد الإجازة',
      messageEn: `${currentUser.nameEn} changed their decision to ${decision}. Current request status: ${nextStatus}.`,
      messageAr: `قام ${currentUser.nameAr} بتحديث قراره إلى ${decision}. الحالة الحالية للطلب: ${nextStatus}.`,
      type: 'leave', priority: 'high', actionUrl: `leave:${requestId}`,
    });
    logAction('LEAVE_APPROVAL_UPDATED', 'Leaves', `Request ${requestId}: ${approverId} changed decision to ${decision}; status ${nextStatus}`);
    return;

    /* Legacy single-step implementation retained in history:
    if (decision === 'rejected') {
      // Immediate rejection of the entire request
      const updatedSteps = target.approvalSteps.map((step) =>
        step.approverId === approverId
          ? { ...step, status: 'rejected' as const, actionDate: new Date().toISOString(), notes }
          : step
      );

      setLeaveRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: 'rejected', approvalSteps: updatedSteps } : r
        )
      );

      // Restore pending balance
      setLeaveBalances((prev) =>
        prev.map((bal) => {
          if (bal.employeeId === target.employeeId && bal.leaveType === target.leaveType) {
            return {
              ...bal,
              pending: Math.max(0, bal.pending - target.durationUnits),
            };
          }
          return bal;
        })
      );

      // Notify requester
      addNotification({
        userId: target.employeeId,
        titleEn: 'Leave Request Rejected',
        titleAr: 'تم رفض طلب الإجازة',
        messageEn: `Your request was rejected by an authorised reviewer. Notes: ${notes || 'No notes provided.'}`,
        messageAr: `تم رفض طلبكم من قِبل إدارة الشركة. الملاحظات: ${notes || 'لا توجد ملاحظات.'}`,
        type: 'leave',
        priority: 'high',
        actionUrl: `leave:${requestId}`,
      });

      logAction('LEAVE_REJECTED', 'Leaves', `Request ${requestId} rejected by ${approverId}`);
      return;
    }

    // Approver Approved this step
    const updatedSteps = target.approvalSteps.map((step) =>
      step.approverId === approverId
        ? { ...step, status: 'approved' as const, actionDate: new Date().toISOString(), notes }
        : step
    );

    const allApproved = updatedSteps.every((s) => s.status === 'approved');

    if (allApproved) {
      // Fully approved!
      setLeaveRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: 'approved', approvalSteps: updatedSteps } : r
        )
      );

      // Deduct balance: pending -= duration, used += duration, remaining -= duration
      setLeaveBalances((prev) =>
        prev.map((bal) => {
          if (bal.employeeId === target.employeeId && bal.leaveType === target.leaveType) {
            return {
              ...bal,
              pending: Math.max(0, bal.pending - target.durationUnits),
              used: bal.used + target.durationUnits,
              remaining: Math.max(0, bal.remaining - target.durationUnits),
            };
          }
          return bal;
        })
      );

      // Update attendance status if date covers today
      if (target.startDate <= todayStr && target.endDate >= todayStr) {
        const attStatus: AttendanceStatus =
          target.leaveType === 'wfh'
            ? 'remote_approved'
            : target.leaveType === 'external_site'
            ? 'external_approved'
            : 'on_leave';

        setAttendanceRecords((prev) =>
          prev.map((r) => {
            if (r.employeeId === target.employeeId && r.date === todayStr) {
              return { ...r, status: attStatus, statusNotes: `Approved ${target.leaveType}` };
            }
            return r;
          })
        );
      }

      // Notify employee
      addNotification({
        userId: target.employeeId,
        titleEn: 'Leave Request Fully Approved',
        titleAr: 'تم اعتماد طلب الإجازة نهائياً',
        messageEn: `Your ${target.leaveType} request has received all required approvals. Balances and attendance are synchronized.`,
        messageAr: `تم اعتماد طلبكم بعد اكتمال جميع الموافقات المطلوبة، وتم تحديث الأرصدة والحضور بنجاح.`,
        type: 'leave',
        priority: 'high',
        actionUrl: `leave:${requestId}`,
      });

      logAction('LEAVE_FULLY_APPROVED', 'Leaves', `Request ${requestId} fully approved by dual signatories`);
    } else {
      // 1 of 2 approved -> Partially Approved
      setLeaveRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: 'partially_approved', approvalSteps: updatedSteps } : r
        )
      );

      // Notify the other approver
      const pendingStep = updatedSteps.find((s) => s.status === 'pending');
      if (pendingStep) {
        addNotification({
          userId: pendingStep.approverId,
          titleEn: 'Second Sign-off Required for Leave',
          titleAr: 'مطلوب التوقيع الثاني لاعتماد الإجازة',
          messageEn: `Request ${requestId} has received initial sign-off. Your final approval is pending.`,
          messageAr: `حصل الطلب ${requestId} على التوقيع الأول، وبانتظار اعتمادكم النهائي لإتمامه.`,
          type: 'leave',
          priority: 'high',
          actionUrl: `leave:${requestId}`,
        });
      }

      logAction('LEAVE_PARTIALLY_APPROVED', 'Leaves', `Request ${requestId} signed by ${approverId}`);
    }
    */
  };

  const cancelLeaveRequest = (requestId: string) => {
    const target = leaveRequests.find((r) => r.id === requestId);
    if (!target || !currentUser || target.employeeId !== currentUser.id) return;

    if (target.status === 'approved') {
      // Restore balance
      setLeaveBalances((prev) =>
        prev.map((bal) => {
          if (bal.employeeId === target.employeeId && bal.leaveType === target.leaveType) {
            return {
              ...bal,
              used: Math.max(0, bal.used - target.durationUnits),
              remaining: bal.remaining + target.durationUnits,
            };
          }
          return bal;
        })
      );
    } else if (target.status === 'pending_approval' || target.status === 'partially_approved') {
      setLeaveBalances((prev) =>
        prev.map((bal) => {
          if (bal.employeeId === target.employeeId && bal.leaveType === target.leaveType) {
            return {
              ...bal,
              pending: Math.max(0, bal.pending - target.durationUnits),
            };
          }
          return bal;
        })
      );
    }

    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' } : r))
    );

    logAction('LEAVE_CANCELLED', 'Leaves', `Request ${requestId} cancelled and balance restored`);
  };

  // Tasks Management
  const createTask = async (taskData: Omit<Task, 'id' | 'activityLogs' | 'comments'>) => {
    if (taskData.assigneeIds.some((id) => users.find((user) => user.id === id)?.roleId === 'co_founder')) {
      return { ok: false, message: 'Monitoring-only co-founders cannot be assigned operational tasks.' };
    }
    const directReportIds = new Set(users
      .filter((user) => user.managerId === currentUser?.id && user.status === 'active')
      .map((user) => user.id));
    const isTeamLead = directReportIds.size > 0;
    const canCreateForAssignees = isFullAccessUser || (isTeamLead && taskData.assigneeIds.every((id) => directReportIds.has(id)));
    if (!canCreateForAssignees) {
      return { ok: false, message: 'You can assign tasks only to your direct team members.' };
    }
    const newTask: Task = {
      ...taskData,
      creatorId: currentUser.id,
      id: `tsk_${Date.now()}`,
      comments: [],
      lastStatusChangedAt: new Date().toISOString(),
      stageHistory: [],
      activityLogs: [
        {
          id: `act_${Date.now()}`,
          userId: currentUser?.id || 'system',
          action: 'Created task and assigned team',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const taskNotifications: NotificationItem[] = taskData.assigneeIds.map((uid, index) => ({
      id: `notif_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
      createdBy: currentUser.id,
        userId: uid,
        titleEn: 'New task assigned · Awaiting start',
        titleAr: 'مهمة جديدة · بانتظار البدء',
        messageEn: `${currentUser.nameEn} assigned you “${taskData.title}” in ${taskData.projectName || 'General work'}. Priority: ${taskData.priority}. Due: ${taskData.dueDate}. Next: open the task and start work.`,
        messageAr: `تم تكليفك بمهمة «${taskData.title}» ضمن ${taskData.projectName || 'الأعمال العامة'}. الأولوية: ${taskData.priority}. تاريخ الاستحقاق: ${taskData.dueDate}. الخطوة التالية: افتح المهمة وابدأ العمل.`,
        type: 'task',
        priority: taskData.priority === 'critical' || taskData.priority === 'high' ? 'high' : 'medium',
        actionUrl: `task:${newTask.id}`,
    }));

    if (supabase) {
      if (!cloudReady) return { ok: false, message: 'Company data is still loading. Please try again in a moment.' };
      const { error } = await supabase.rpc('create_company_task_delivery', {
        task_payload: newTask,
        notification_payloads: taskNotifications,
      });
      if (error) {
        const missingMigration = error.code === 'PGRST202' || error.message.includes('create_company_task_delivery');
        return {
          ok: false,
          message: missingMigration
            ? 'Database migration 0016 is required before tasks can be delivered safely.'
            : error.message,
        };
      }
      rememberCloudDocuments([
        { kind: 'task', document_id: newTask.id, owner_id: newTask.creatorId, payload: newTask },
        ...taskNotifications.map((notification) => ({
          kind: 'notification' as const,
          document_id: notification.id,
          owner_id: notification.userId,
          payload: notification,
        })),
      ]);
      setTasks((prev) => [newTask, ...prev]);
      const ownNotifications = taskNotifications.filter((notification) => notification.userId === currentUser.id);
      if (ownNotifications.length) setNotifications((prev) => [...ownNotifications, ...prev]);
      taskNotifications.forEach(dispatchPushNotification);
      logAction('TASK_CREATED', 'Tasks', `Created and delivered task "${taskData.title}"`);
      return { ok: true, taskId: newTask.id, message: 'Task and assignee notifications were saved together.' };
    }

    // Local development fallback only. Production uses the atomic RPC above.
    setTasks((prev) => [newTask, ...prev]);
    const deliveries = await Promise.all(taskNotifications.map((notification) => addNotification(notification)));

    logAction('TASK_CREATED', 'Tasks', `Created task "${taskData.title}"`);
    const failedDeliveries = deliveries.filter((delivery) => !delivery.ok);
    return failedDeliveries.length
      ? { ok: true, taskId: newTask.id, message: 'The task was saved. One or more alerts are queued for retry; use Sync if they do not arrive.' }
      : { ok: true, taskId: newTask.id, message: 'Task saved and delivered to the assigned employee.' };
  };

  const updateTask = (updatedTask: Task) => {
    if (!isFullAccessUser) return;
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    logAction('TASK_UPDATED', 'Tasks', `Updated task "${updatedTask.title}"`);
  };

  const deleteTask = (taskId: string) => {
    if (!isFullAccessUser) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    void updateTaskStatus(taskId, 'cancelled', 'Archived by an authorised manager; record retained.');
  };

  const transitionTask = async (taskId: string, newStatus: TaskStatus, note?: string, reviewScore?: number, taskSnapshot?: Task) => {
    const target = taskSnapshot || tasks.find((task) => task.id === taskId);
    if (!target) return { ok: false, message: 'Task not found.' };
    const isParticipant = target.assigneeIds.includes(currentUser.id) || target.creatorId === currentUser.id;
    if (!isFullAccessUser && !isParticipant) return { ok: false, message: 'You are not authorised to update this task.' };
    if (!canTransitionTask(target.status, newStatus)) return { ok: false, message: `Invalid workflow transition: ${target.status} → ${newStatus}.` };
    if (['blocked', 'needs_revision', 'cancelled'].includes(newStatus) && !note?.trim()) return { ok: false, message: 'A reason is required for this stage.' };

    const timestamp = new Date().toISOString();
    const historyEntry = {
      id: `stage_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      from: target.status,
      to: newStatus,
      actorId: currentUser.id,
      actorName: currentUser.nameEn,
      timestamp,
      note: note?.trim() || undefined,
    };
    const recipientIds = new Set<string>();
    if (['blocked', 'submitted'].includes(newStatus)) {
      recipientIds.add(target.creatorId);
      users.filter((user) => user.roleId === 'sys_admin').forEach((user) => recipientIds.add(user.id));
    } else target.assigneeIds.forEach((id) => recipientIds.add(id));
    recipientIds.delete(currentUser.id);
    const deliveries = [...recipientIds].map((recipientId) => buildTaskStageNotification({
      task: target, from: target.status, to: newStatus, actor: currentUser, recipientId, note,
    }));
    let nextTask: Task = {
      ...target,
      status: newStatus,
      progressPercent: newStatus === 'completed' ? 100 : newStatus === 'in_progress' ? Math.max(10, target.progressPercent) : target.progressPercent,
      lastStatusChangedAt: timestamp,
      completedAt: newStatus === 'completed' ? timestamp : target.completedAt,
      archivedAt: newStatus === 'cancelled' ? timestamp : target.archivedAt,
      reviewScore: reviewScore ?? target.reviewScore,
      managerReviewNotes: note ?? target.managerReviewNotes,
      stageHistory: [...(target.stageHistory || []), historyEntry],
      activityLogs: [...target.activityLogs, {
        id: `act_${Date.now()}`,
        userId: currentUser.id,
        action: `${TASK_STAGE_META[target.status].en} → ${TASK_STAGE_META[newStatus].en}${note ? ` · ${note}` : ''}`,
        timestamp,
      }],
    };
    if (supabase) {
      if (!cloudReady) return { ok: false, message: 'Company data is still loading. Please try again.' };
      const { data, error } = await supabase.rpc('transition_company_task', {
        task_document_id: taskId,
        expected_status: target.status,
        next_status: newStatus,
        transition_note: note || null,
        transition_notifications: deliveries,
        task_review_score: reviewScore ?? null,
      });
      if (error) {
        const missing = error.code === 'PGRST202' || error.message.includes('transition_company_task');
        return { ok: false, message: missing ? 'Database migration 0020 is required to update task stages safely.' : error.message };
      }
      const authoritativeTask = (data as { task?: Task } | null)?.task;
      if (!authoritativeTask || authoritativeTask.id !== taskId || authoritativeTask.status !== newStatus) {
        return { ok: false, message: 'The server did not return the authoritative task state. Refresh and try again.' };
      }
      nextTask = authoritativeTask;
      rememberCloudDocuments([
        { kind: 'task', document_id: nextTask.id, owner_id: nextTask.creatorId, payload: nextTask },
        ...deliveries.map((notification) => ({ kind: 'notification' as const, document_id: notification.id, owner_id: notification.userId, payload: notification })),
      ], false);
    } else if (deliveries.length) {
      setNotifications((previous) => [...deliveries, ...previous]);
    }
    setTasks((prev) => prev.map((task) => task.id === taskId ? nextTask : task));
    deliveries.forEach(dispatchPushNotification);
    logAction('TASK_STATUS_CHANGED', 'Tasks', `Task ${taskId} moved to ${newStatus}`);
    return { ok: true };
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus, note?: string) => transitionTask(taskId, newStatus, note);

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !target.assigneeIds.includes(currentUser.id)) return { ok: false, message: 'You are not authorised to update this task.' };
    if (!target.subtasks.some((subtask) => subtask.id === subtaskId)) return { ok: false, message: 'Task step not found. Refresh and try again.' };
    const updatedSubs = target.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, isCompleted: !subtask.isCompleted } : subtask);
    const progress = updatedSubs.length ? Math.round((updatedSubs.filter((subtask) => subtask.isCompleted).length / updatedSubs.length) * 100) : 0;
    const updatedTask = { ...target, subtasks: updatedSubs, progressPercent: progress };
    if (supabase) {
      const persisted = await persistDocumentNow('task', { id: updatedTask.id, ownerId: updatedTask.creatorId, payload: updatedTask });
      if (!persisted.ok) return persisted;
    }
    setTasks((previous) => previous.map((task) => task.id === taskId ? updatedTask : task));
    if (progress === 100 && canTransitionTask(target.status, 'submitted')) {
      const result = await transitionTask(taskId, 'submitted', undefined, undefined, updatedTask);
      if (!result.ok) return { ok: false, message: `Step saved, but submission for review failed: ${result.message || 'Please try again.'}` };
    }
    return { ok: true };
  };

  const addTaskSubtask = (taskId: string, title: string) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !title.trim() || (!isFullAccessUser && target.creatorId !== currentUser.id && !target.assigneeIds.includes(currentUser.id))) return;
    setTasks((previous) => previous.map((task) => task.id === taskId ? {
      ...task,
      subtasks: [...task.subtasks, { id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title: title.trim(), isCompleted: false }],
    } : task));
  };

  const addTaskAttachment = async (taskId: string, name: string, url: string) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !name.trim() || !/^https:\/\//i.test(url.trim()) || (!isFullAccessUser && target.creatorId !== currentUser.id && !target.assigneeIds.includes(currentUser.id))) return { ok: false, message: 'A valid HTTPS link and task access are required.' };
    const attachment = { id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: name.trim(), fileType: 'link' as const, url: url.trim(), uploadedAt: new Date().toISOString() };
    if (!supabase) {
      setTasks((previous) => previous.map((task) => task.id === taskId ? { ...task, attachments: [...task.attachments, attachment] } : task));
      return { ok: true };
    }
    if (!cloudReady) return { ok: false, message: 'Company data is still loading. Please try again.' };
    const { data, error } = await supabase.rpc('add_company_task_attachment', { task_document_id: taskId, attachment_payload: attachment });
    if (error) return { ok: false, message: error.message };
    const authoritativeTask = (data as { task?: Task } | null)?.task;
    if (!authoritativeTask) return { ok: false, message: 'The server did not return the updated task.' };
    setTasks((previous) => previous.map((task) => task.id === taskId ? authoritativeTask : task));
    rememberCloudDocuments([{ kind: 'task', document_id: authoritativeTask.id, owner_id: authoritativeTask.creatorId, payload: authoritativeTask }], false);
    return { ok: true };
  };

  /** Upload a small approved file, then append its private path through an
   * atomic database function so an old browser tab cannot overwrite the task. */
  const uploadTaskAttachment = async (taskId: string, file: File) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || (!isFullAccessUser && target.creatorId !== currentUser.id && !target.assigneeIds.includes(currentUser.id))) {
      return { ok: false, message: 'You are not authorised to attach a file to this task.' };
    }
    const validationMessage = validateTaskAttachment(file);
    if (validationMessage) return { ok: false, message: validationMessage };
    if (!supabase) return { ok: false, message: 'File uploads require the company database connection.' };
    if (!cloudReady) return { ok: false, message: 'Company data is still loading. Please try again in a moment.' };

    const attachmentId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${currentUser.id}/${taskId}/${attachmentId}_${safeTaskAttachmentName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('task-attachments').upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploadError) return { ok: false, message: uploadError.message };

    const attachment = {
      id: attachmentId,
      name: file.name,
      fileType: taskAttachmentKind(file.name),
      size: formatTaskAttachmentSize(file.size),
      url: '',
      storagePath,
      uploadedAt: new Date().toISOString(),
    };
    const { data, error } = await supabase.rpc('add_company_task_attachment', {
      task_document_id: taskId,
      attachment_payload: attachment,
    });
    if (error) {
      // Retention policy is deliberately append-only. An unlinked private
      // upload remains recoverable for authorised review instead of being
      // silently erased after a transient database failure.
      const missing = error.code === 'PGRST202' || error.message.includes('add_company_task_attachment');
      return { ok: false, message: missing ? 'Database migration 0023 is required before uploading task files.' : error.message };
    }
    const authoritativeTask = (data as { task?: Task } | null)?.task;
    if (!authoritativeTask) return { ok: false, message: 'The file was uploaded but the task did not return an updated record. Refresh and verify it.' };
    setTasks((previous) => previous.map((task) => task.id === taskId ? authoritativeTask : task));
    rememberCloudDocuments([{ kind: 'task', document_id: authoritativeTask.id, owner_id: authoritativeTask.creatorId, payload: authoritativeTask }], false);
    return { ok: true };
  };

  const getTaskAttachmentUrl = async (attachment: Task['attachments'][number]) => {
    if (!attachment.storagePath) return attachment.url ? { ok: true, url: attachment.url } : { ok: false, message: 'Attachment link is unavailable.' };
    if (!supabase) return { ok: false, message: 'The company database connection is required to open this file.' };
    const { data, error } = await supabase.storage.from('task-attachments').createSignedUrl(attachment.storagePath, 60);
    return error || !data?.signedUrl ? { ok: false, message: error?.message || 'Could not create a secure file link.' } : { ok: true, url: data.signedUrl };
  };

  const logTaskTime = (taskId: string, hours: number) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !Number.isFinite(hours) || hours <= 0 || hours > 24 || (!isFullAccessUser && !target.assigneeIds.includes(currentUser.id))) return;
    const timestamp = new Date().toISOString();
    setTasks((previous) => previous.map((task) => task.id === taskId ? {
      ...task,
      actualHours: Number((task.actualHours + hours).toFixed(2)),
      activityLogs: [...task.activityLogs, { id: `act_time_${Date.now()}`, userId: currentUser.id, action: `Logged ${hours} working hours`, timestamp }],
    } : task));
  };

  const addTaskComment = async (taskId: string, content: string) => {
    const target = tasks.find((task) => task.id === taskId);
    const text = content.trim();
    if (!target || (!isFullAccessUser && target.creatorId !== currentUser.id && !target.assigneeIds.includes(currentUser.id))) return { ok: false, message: 'Not authorised.' };
    if (!text || text.length > 4000) return { ok: false, message: 'Comment must be between 1 and 4000 characters.' };
    const commentId = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    if (supabase) {
      if (!cloudReady) return { ok: false, message: 'Company data is still loading.' };
      const { data, error } = await supabase.rpc('add_task_comment', { task_document_id: taskId, comment_id: commentId, comment_content: text });
      if (error) return { ok: false, message: error.code === 'PGRST202' ? 'Database migration 0021 is required to send comments.' : error.message };
      const saved = data?.task as Task | undefined;
      if (!saved || saved.id !== taskId) return { ok: false, message: 'The server returned an invalid task.' };
      const deliveries = (data.notifications || []) as NotificationItem[];
      rememberCloudDocuments([{ kind: 'task', document_id: saved.id, owner_id: saved.creatorId, payload: saved }, ...deliveries.map((notification) => ({ kind: 'notification' as const, document_id: notification.id, owner_id: notification.userId, payload: notification }))], false);
      setTasks((prev) => prev.map((task) => task.id === taskId ? saved : task));
      deliveries.forEach(dispatchPushNotification);
    } else {
      setTasks((prev) => prev.map((task) => task.id === taskId ? { ...task, comments: [...task.comments, { id: commentId, userId: currentUser.id, content: text, createdAt: new Date().toISOString() }] } : task));
    }
    return { ok: true };
  };

  const reviewTask = async (taskId: string, decision: 'approve' | 'revise', score?: number, notes?: string) => {
    if (!isFullAccessUser) return { ok: false, message: 'Only authorised reviewers can review tasks.' };
    const taskToReview = tasks.find((task) => task.id === taskId);
    if (!taskToReview) return { ok: false, message: 'Task not found.' };
    const normalizedScore = Math.max(0, Math.min(100, score ?? 100));
    const result = await transitionTask(
      taskId,
      decision === 'approve' ? 'completed' : 'needs_revision',
      notes || (decision === 'revise' ? 'Revision required' : undefined),
      normalizedScore,
    );
    if (!result.ok) return result;
    if (decision === 'approve') {
      setKpiRecords((previous) => previous.map((record) => {
        if (!taskToReview.assigneeIds.includes(record.employeeId) || record.evaluatorId !== currentUser.id) return record;
        const nextWorkScore = Number(((normalizedScore / 100) * 40).toFixed(1));
        const totalScore = Number((record.totalScore - record.workScore.scoreOutOfWeight + nextWorkScore).toFixed(1));
        return { ...record, workScore: { ...record.workScore, scoreOutOfWeight: nextWorkScore, scorePercentage: normalizedScore, managerNotes: notes || `Task review: ${taskToReview.title}` }, totalScore, status: 'published', reviewedBy: currentUser.nameEn, publishedAt: new Date().toISOString() };
      }));
    }
    logAction('TASK_REVIEWED', 'Tasks', `Task ${taskId} review result: ${decision}`);
    return { ok: true };
  };

  // KPI Management
  const updateKPIRecord = (record: MonthlyKPIRecord) => {
    if (!isFullAccessUser) return;
    setKpiRecords((prev) => {
      const existingIndex = prev.findIndex((k) => k.id === record.id);
      if (existingIndex === -1) return [...prev, record];
      return prev.map((k) => (k.id === record.id ? record : k));
    });
    logAction('KPI_UPDATED', 'KPI', `KPI updated for employee ${record.employeeId} (Month ${record.month}/${record.year})`);
  };

  // Geofence & Schedules
  const updateGeofenceZone = (zone: GeofenceZone) => {
    if (!isFullAccessUser) return;
    setGeofenceZones((prev) => prev.map((z) => (z.id === zone.id ? zone : z)));
    logAction('GEOFENCE_ZONE_UPDATED', 'Settings', `Updated geofence zone ${zone.nameEn}`);
  };

  const addGeofenceZone = (zoneData: Omit<GeofenceZone, 'id'>) => {
    if (!isFullAccessUser) return;
    const newZone: GeofenceZone = {
      ...zoneData,
      id: `zone_${Date.now()}`,
    };
    setGeofenceZones((prev) => [...prev, newZone]);
    logAction('GEOFENCE_ZONE_ADDED', 'Settings', `Added geofence zone ${zoneData.nameEn}`);
  };

  const deleteGeofenceZone = (zoneId: string) => {
    if (!isFullAccessUser || geofenceZones.filter((item) => item.isActive).length <= 1) return false;
    const zone = geofenceZones.find((item) => item.id === zoneId);
    if (!zone || zone.isPrimary) return false;
    setGeofenceZones((prev) => prev.map((item) => item.id === zoneId ? {
      ...item,
      isActive: false,
    } : item));
    logAction('GEOFENCE_ZONE_ARCHIVED', 'Settings', `Deactivated geofence zone ${zone.nameEn}; the record was retained.`);
    return true;
  };

  const updateWorkSchedule = (schedule: WorkSchedule) => {
    if (!isFullAccessUser) return;
    setWorkSchedules((prev) => prev.map((s) => (s.id === schedule.id ? schedule : s)));
    logAction('SCHEDULE_UPDATED', 'Settings', `Updated work schedule ${schedule.nameEn}`);
  };

  const addWorkSchedule = (scheduleData: Omit<WorkSchedule, 'id'>) => {
    if (!isFullAccessUser) return;
    const schedule: WorkSchedule = { ...scheduleData, id: `sched_${Date.now()}` };
    setWorkSchedules((prev) => [...prev, schedule]);
    logAction('SCHEDULE_ADDED', 'Settings', `Added work schedule ${schedule.nameEn}`);
  };

  const deleteWorkSchedule = (scheduleId: string) => {
    if (!isFullAccessUser || workSchedules.filter((item) => !item.archivedAt).length <= 1) return false;
    const schedule = workSchedules.find((item) => item.id === scheduleId);
    if (!schedule || users.some((user) => user.workScheduleId === scheduleId)) return false;
    setWorkSchedules((prev) => prev.map((item) => item.id === scheduleId ? {
      ...item,
      archivedAt: new Date().toISOString(),
    } : item));
    logAction('SCHEDULE_ARCHIVED', 'Settings', `Archived work schedule ${schedule.nameEn}; the record was retained.`);
    return true;
  };

  const addHoliday = (holidayData: Omit<Holiday, 'id'>) => {
    if (!isFullAccessUser) return;
    const newHol: Holiday = {
      ...holidayData,
      id: `hol_${Date.now()}`,
    };
    setHolidays((prev) => [...prev, newHol]);
    logAction('HOLIDAY_ADDED', 'Settings', `Added company holiday ${holidayData.nameEn}`);
  };

  const updateHoliday = (holiday: Holiday) => {
    if (!isFullAccessUser) return;
    setHolidays((prev) => prev.map((item) => (item.id === holiday.id ? holiday : item)));
    logAction('HOLIDAY_UPDATED', 'Settings', `Updated company holiday ${holiday.nameEn}`);
  };

  const deleteHoliday = (holidayId: string) => {
    if (!isFullAccessUser) return;
    const holiday = holidays.find((item) => item.id === holidayId);
    if (!holiday) return;
    setHolidays((prev) => prev.map((item) => item.id === holidayId ? {
      ...item,
      archivedAt: new Date().toISOString(),
    } : item));
    logAction('HOLIDAY_ARCHIVED', 'Settings', `Archived company holiday ${holiday.nameEn}; the record was retained.`);
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id && (n.userId === currentUser.id || n.userId === 'all') ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => n.userId === currentUser.id || n.userId === 'all' ? { ...n, isRead: true } : n));
  };

  return (
    <DataContext.Provider
      value={{
        attendanceRecords,
        todayAttendance,
        checkIn,
        checkOut,
        resolveAttendanceException,
        geofenceZones,
        updateGeofenceZone,
        addGeofenceZone,
        deleteGeofenceZone,
        workSchedules,
        updateWorkSchedule,
        addWorkSchedule,
        deleteWorkSchedule,
        holidays,
        addHoliday,
        updateHoliday,
        deleteHoliday,
        leaveRequests,
        leaveBalances,
        createLeaveRequest,
        handleLeaveApproval,
        cancelLeaveRequest,
        tasks,
        createTask,
        updateTask,
        deleteTask,
        updateTaskStatus,
        toggleSubtask,
        addTaskSubtask,
        addTaskAttachment,
        uploadTaskAttachment,
        getTaskAttachmentUrl,
        logTaskTime,
        addTaskComment,
        reviewTask,
        kpiRecords,
        updateKPIRecord,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        auditLogs,
        logAction,
        refreshCompanyData,
        isSyncing,
        lastSyncedAt,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
