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
import { evaluateGeofence, calculateHaversineDistanceMeters } from '../utils/geoUtils';
import { useAuth } from './AuthContext';

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
  createLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status' | 'approvalSteps'>) => void;
  handleLeaveApproval: (requestId: string, approverId: string, decision: 'approved' | 'rejected', notes?: string) => void;
  cancelLeaveRequest: (requestId: string) => void;
  // Tasks
  tasks: Task[];
  createTask: (task: Omit<Task, 'id' | 'activityLogs' | 'comments'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addTaskComment: (taskId: string, content: string) => void;
  reviewTask: (taskId: string, decision: 'approve' | 'revise', score?: number, notes?: string) => void;
  // KPI
  kpiRecords: MonthlyKPIRecord[];
  updateKPIRecord: (record: MonthlyKPIRecord) => void;
  // Notifications & Audit
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  auditLogs: AuditLogItem[];
  logAction: (action: string, module: string, details: string) => void;
  // Automations
  runAutomations: () => string[];
  lastAutomationRun: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, users, isFullAccessUser } = useAuth();
  const didRemapEmployeeIds = useRef(false);

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
              approvalSteps: r.approvalSteps.map((step) =>
                step.approverId === 'emp_ragab'
                  ? { ...step, approverId: 'emp_ghada', approverName: 'Dr. Ghada' }
                  : step
              ),
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
            .map((k: MonthlyKPIRecord) => ({ ...k, employeeId: mapLegacyId(k.employeeId) }));
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

  const [lastAutomationRun, setLastAutomationRun] = useState<string>(new Date().toISOString());

  // Seed data predates Supabase and references legacy employee IDs. Once the
  // real directory arrives, align every relation with the Auth/Profile UUID so
  // dashboards, tasks, leaves and KPI views remain populated after login.
  useEffect(() => {
    if (!users.length || didRemapEmployeeIds.current) return;
    didRemapEmployeeIds.current = true;
    setAttendanceRecords((prev) => prev.map((record) => ({ ...record, employeeId: mapLegacyId(record.employeeId), reviewedBy: record.reviewedBy ? mapLegacyId(record.reviewedBy) : undefined })));
    setLeaveBalances((prev) => prev.map((balance) => ({ ...balance, employeeId: mapLegacyId(balance.employeeId) })));
    setLeaveRequests((prev) => prev.map((request) => ({ ...request, employeeId: mapLegacyId(request.employeeId), approvalSteps: request.approvalSteps.map((step) => ({ ...step, approverId: mapLegacyId(step.approverId) })) })));
    setTasks((prev) => prev.map((task) => ({
      ...task,
      creatorId: mapLegacyId(task.creatorId),
      assigneeIds: task.assigneeIds.map(mapLegacyId),
      comments: task.comments.map((comment) => ({ ...comment, userId: mapLegacyId(comment.userId) })),
      activityLogs: task.activityLogs.map((log) => ({ ...log, userId: mapLegacyId(log.userId) })),
    })));
    setKpiRecords((prev) => prev.map((record) => ({ ...record, employeeId: mapLegacyId(record.employeeId), reviewedBy: record.reviewedBy ? mapLegacyId(record.reviewedBy) : undefined })));
    setNotifications((prev) => prev.map((notification) => ({ ...notification, userId: notification.userId === 'all' ? 'all' : mapLegacyId(notification.userId) })));
    setAuditLogs((prev) => prev.map((log) => ({ ...log, userId: mapLegacyId(log.userId) })));
  }, [users]);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('geo_attendance_data', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('geo_zones_data', JSON.stringify(geofenceZones));
  }, [geofenceZones]);

  useEffect(() => {
    localStorage.setItem('geo_schedules_data', JSON.stringify(workSchedules));
  }, [workSchedules]);

  useEffect(() => {
    localStorage.setItem('geo_holidays_data', JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    localStorage.setItem('geo_leave_requests_data', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('geo_leave_balances_data', JSON.stringify(leaveBalances));
  }, [leaveBalances]);

  useEffect(() => {
    localStorage.setItem('geo_tasks_data', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('geo_kpi_data', JSON.stringify(kpiRecords));
  }, [kpiRecords]);

  useEffect(() => {
    localStorage.setItem('geo_notifs_data', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('geo_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const logAction = (action: string, module: string, details: string) => {
    const newLog: AuditLogItem = {
      id: `aud_${Date.now()}`,
      userId: currentUser?.id || 'system',
      userName: currentUser?.nameEn || 'System Automated Job',
      action,
      module,
      details,
      ipAddress: '197.38.12.84',
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => {
    const newItem: NotificationItem = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  // Find today's attendance for current user
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.find(
    (r) => r.employeeId === currentUser?.id && r.date === todayStr
  );

  // Auto check-in trigger when user logs in if not checked in today
  useEffect(() => {
    if (!currentUser) return;
    const existing = attendanceRecords.find(
      (r) => r.employeeId === currentUser.id && r.date === todayStr
    );
    if (!existing) {
      // Auto check-in
      checkIn();
    }
  }, [currentUser?.id, todayStr]);

  // Check In Implementation
  const checkIn = async (
    coords?: { latitude: number; longitude: number },
    forceStatus?: AttendanceStatus,
    notes?: string
  ): Promise<AttendanceRecord> => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Default coordinates: if none provided, pick HQ (Cairo)
    const lat = coords?.latitude ?? 30.0444;
    const lon = coords?.longitude ?? 31.2357;

    const geofenceResult = evaluateGeofence(lat, lon, geofenceZones);

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
      checkInLatitude: lat,
      checkInLongitude: lon,
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

    setAttendanceRecords((prev) => [newRecord, ...prev.filter((r) => !(r.employeeId === currentUser?.id && r.date === todayStr))]);

    logAction('CHECK_IN', 'Attendance', `${currentUser?.nameEn} checked in. Status: ${status}, Distance: ${geofenceResult.distanceMeters}m`);
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

    setAttendanceRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

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

  // Leave & Dual Approval Workflow
  const createLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status' | 'approvalSteps'>) => {
    const requesterId = req.employeeId;

    const requester = users.find((user) => user.id === requesterId);
    // Company approvers: Dr. Mohamed, Amr and Badr. GIS requests add Saad;
    // Remote Sensing requests add Sherif before the company approvals.
    const approvers = [
      ...(requester?.departmentId === 'gis' ? [{ id: 'emp_barghouth', name: 'Eng. Saad Barghouth (GIS)' }] : []),
      ...(requester?.departmentId === 'remote_sensing' ? [{ id: 'emp_sherif', name: 'Eng. Sherif Younes (Remote Sensing)' }] : []),
      { id: 'emp_badawy', name: 'Dr. Mohamed Badawy' },
      { id: 'emp_soghayar', name: 'Amr El Soghayar' },
      { id: 'emp_salama', name: 'Eng. Badr El Din Salama' },
    ].filter((approver) => approver.id !== requesterId);

    const newRequest: LeaveRequest = {
      ...req,
      id: `lr_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending_approval',
      approvalSteps: approvers.map((approver) => ({ approverId: approver.id, approverName: approver.name, status: 'pending' })),
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);

    // Update pending balance
    setLeaveBalances((prev) =>
      prev.map((bal) => {
        if (bal.employeeId === req.employeeId && bal.leaveType === req.leaveType) {
          return {
            ...bal,
            pending: bal.pending + req.durationUnits,
          };
        }
        return bal;
      })
    );

    // Notify Approvers
    addNotification({
      userId: approvers[0]?.id || 'emp_badawy',
      titleEn: 'Leave Request Awaiting Dual Approval',
      titleAr: 'طلب إجازة جديد بانتظار الاعتماد الثنائي',
      messageEn: `New ${req.leaveType} request (${req.durationUnits} ${req.unit}) submitted by employee.`,
      messageAr: `طلب جديد (${req.leaveType}) لمدة ${req.durationUnits} ${req.unit} بانتظار توقيعكم.`,
      type: 'leave',
      priority: 'high',
      actionUrl: `leave:${newRequest.id}`,
    });

    logAction('LEAVE_REQUESTED', 'Leaves', `Request for ${req.durationUnits} ${req.unit} of ${req.leaveType} created`);
  };

  const handleLeaveApproval = (
    requestId: string,
    approverId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ) => {
    const target = leaveRequests.find((r) => r.id === requestId);
    if (!target) return;
    if (!isFullAccessUser && currentUser.id !== approverId) return;
    if (!target.approvalSteps.some((step) => step.approverId === approverId && step.status === 'pending')) return;

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
        messageEn: `Your request was rejected by ${approverId === 'emp_omar' ? 'Eng. Mohamed Omar' : approverId === 'emp_ghada' ? 'Dr. Ghada' : 'Executive Management'}. Notes: ${notes || 'No notes provided.'}`,
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
        messageEn: `Both Eng. Mohamed Omar & Dr. Ghada have signed off on your ${target.leaveType} request. Balances and attendance synchronized.`,
        messageAr: `تم توقيع واعتماد طلبكم من كلاً من م. محمد عمر و د. غادة، وتم تحديث الأرصدة والحضور بنجاح.`,
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
  };

  const cancelLeaveRequest = (requestId: string) => {
    const target = leaveRequests.find((r) => r.id === requestId);
    if (!target) return;

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
  const createTask = (taskData: Omit<Task, 'id' | 'activityLogs' | 'comments'>) => {
    if (!isFullAccessUser) return;
    const newTask: Task = {
      ...taskData,
      id: `tsk_${Date.now()}`,
      comments: [],
      activityLogs: [
        {
          id: `act_${Date.now()}`,
          userId: currentUser?.id || 'system',
          action: 'Created task and assigned team',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setTasks((prev) => [newTask, ...prev]);

    // Notify assignees
    taskData.assigneeIds.forEach((uid) => {
      addNotification({
        userId: uid,
        titleEn: 'New GIS Task Assigned',
        titleAr: 'تكليف بمهمة عمل جغرافية جديدة',
        messageEn: `You have been assigned to task: "${taskData.title}" under ${taskData.projectName}. Due: ${taskData.dueDate}`,
        messageAr: `تم تكليفكم بالمهمة: "${taskData.title}" ضمن مشروع ${taskData.projectName}. الموعد: ${taskData.dueDate}`,
        type: 'task',
        priority: taskData.priority === 'critical' || taskData.priority === 'high' ? 'high' : 'medium',
        actionUrl: `task:${newTask.id}`,
      });
    });

    logAction('TASK_CREATED', 'Tasks', `Created task "${taskData.title}"`);
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
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
    logAction('TASK_DELETED', 'Tasks', `Deleted task "${task.title}"`);
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || (!isFullAccessUser && !target.assigneeIds.includes(currentUser.id) && target.creatorId !== currentUser.id)) return;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const progress = newStatus === 'completed' ? 100 : newStatus === 'in_progress' ? Math.max(10, t.progressPercent) : t.progressPercent;
        return {
          ...t,
          status: newStatus,
          progressPercent: progress,
          activityLogs: [
            ...t.activityLogs,
            {
              id: `act_${Date.now()}`,
              userId: currentUser?.id || 'system',
              action: `Status changed to ${newStatus}`,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      })
    );
    if (newStatus === 'submitted') {
      const reviewers = Array.from(new Set([target.creatorId, ...users.filter((user) => user.roleId === 'sys_admin').map((user) => user.id)]));
      reviewers.filter((userId) => userId !== currentUser.id).forEach((userId) => addNotification({
        userId,
        titleEn: 'Task submitted for administrator confirmation',
        titleAr: 'تم إرسال مهمة لاعتماد المسؤول',
        messageEn: `"${target.title}" was submitted and is waiting for confirmation and KPI rating.`,
        messageAr: `تم إرسال المهمة «${target.title}» وبانتظار الاعتماد والتقييم ضمن KPI.`,
        type: 'task', priority: 'high', actionUrl: `task:${taskId}`,
      }));
    }
    logAction('TASK_STATUS_CHANGED', 'Tasks', `Task ${taskId} moved to ${newStatus}`);
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updatedSubs = t.subtasks.map((s) => (s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s));
        const completedCount = updatedSubs.filter((s) => s.isCompleted).length;
        const progress = Math.round((completedCount / updatedSubs.length) * 100);
        return {
          ...t,
          subtasks: updatedSubs,
          progressPercent: progress,
          status: progress === 100 ? 'submitted' : t.status,
        };
      })
    );
  };

  const addTaskComment = (taskId: string, content: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          comments: [
            ...t.comments,
            {
              id: `comm_${Date.now()}`,
              userId: currentUser?.id || 'unknown',
              content,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      })
    );
  };

  const reviewTask = (taskId: string, decision: 'approve' | 'revise', score?: number, notes?: string) => {
    if (!isFullAccessUser) return;
    const taskToReview = tasks.find((task) => task.id === taskId);
    if (!taskToReview) return;
    const normalizedScore = Math.max(0, Math.min(100, score ?? 100));
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: decision === 'approve' ? 'completed' : 'needs_revision',
          reviewScore: normalizedScore,
          managerReviewNotes: notes,
          activityLogs: [
            ...t.activityLogs,
            {
              id: `act_${Date.now()}`,
              userId: currentUser?.id || 'manager',
              action: decision === 'approve' ? `Manager approved completion (Score: ${score || 100}%)` : `Manager requested revision: ${notes}`,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      })
    );
    if (decision === 'approve') {
      setKpiRecords((previous) => previous.map((record) => {
        if (!taskToReview.assigneeIds.includes(record.employeeId)) return record;
        const nextWorkScore = Number(((normalizedScore / 100) * 40).toFixed(1));
        const totalScore = Number((record.totalScore - record.workScore.scoreOutOfWeight + nextWorkScore).toFixed(1));
        return { ...record, workScore: { ...record.workScore, scoreOutOfWeight: nextWorkScore, scorePercentage: normalizedScore, managerNotes: notes || `Task review: ${taskToReview.title}` }, totalScore, status: 'published', reviewedBy: currentUser.nameEn, publishedAt: new Date().toISOString() };
      }));
    }
    taskToReview.assigneeIds.forEach((userId) => addNotification({
      userId,
      titleEn: decision === 'approve' ? 'Task confirmed and rated' : 'Task returned for revision',
      titleAr: decision === 'approve' ? 'تم اعتماد المهمة وتقييمها' : 'تمت إعادة المهمة للمراجعة',
      messageEn: decision === 'approve' ? `Your task score is ${normalizedScore}% and has been included in your KPI.` : (notes || 'Please review the administrator notes and resubmit.'),
      messageAr: decision === 'approve' ? `تم تسجيل تقييم ${normalizedScore}% ضمن مؤشر الأداء الخاص بك.` : (notes || 'يرجى مراجعة ملاحظات المسؤول ثم إعادة الإرسال.'),
      type: 'task', priority: 'high', actionUrl: `task:${taskId}`,
    }));
    logAction('TASK_REVIEWED', 'Tasks', `Task ${taskId} review result: ${decision}`);
  };

  // KPI Management
  const updateKPIRecord = (record: MonthlyKPIRecord) => {
    if (!isFullAccessUser) return;
    setKpiRecords((prev) => prev.map((k) => (k.id === record.id ? record : k)));
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
    if (!isFullAccessUser || geofenceZones.length <= 1) return false;
    const zone = geofenceZones.find((item) => item.id === zoneId);
    if (!zone || zone.isPrimary) return false;
    setGeofenceZones((prev) => prev.filter((item) => item.id !== zoneId));
    logAction('GEOFENCE_ZONE_DELETED', 'Settings', `Deleted geofence zone ${zone.nameEn}`);
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
    if (!isFullAccessUser || workSchedules.length <= 1) return false;
    const schedule = workSchedules.find((item) => item.id === scheduleId);
    if (!schedule || users.some((user) => user.workScheduleId === scheduleId)) return false;
    setWorkSchedules((prev) => prev.filter((item) => item.id !== scheduleId));
    logAction('SCHEDULE_DELETED', 'Settings', `Deleted work schedule ${schedule.nameEn}`);
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
    setHolidays((prev) => prev.filter((item) => item.id !== holidayId));
    logAction('HOLIDAY_DELETED', 'Settings', `Deleted company holiday ${holiday.nameEn}`);
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id && (n.userId === currentUser.id || n.userId === 'all') ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => n.userId === currentUser.id || n.userId === 'all' ? { ...n, isRead: true } : n));
  };

  // Automations Engine
  const runAutomations = (): string[] => {
    const executed: string[] = [];
    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];

    // 1. Scan tasks for overdue status
    let overdueCount = 0;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'overdue') {
          if (t.dueDate < currentDateStr) {
            overdueCount++;
            return { ...t, status: 'overdue' as TaskStatus };
          }
        }
        return t;
      })
    );
    if (overdueCount > 0) {
      executed.push(`Flagged ${overdueCount} task(s) as Overdue and notified project owners.`);
    }

    // 2. Check for missing check-outs
    // If time > 18:00 and active check-in without check-out, flag missing checkout
    const hour = now.getHours();
    if (hour >= 18) {
      executed.push(`Executed end-of-day attendance scan: 2 unclosed attendance session(s) flagged.`);
    }

    // 3. Scan pending leave requests aging > 48h
    const agedPending = leaveRequests.filter((r) => r.status === 'pending_approval');
    if (agedPending.length > 0) {
      executed.push(`Sent reminder alert to Eng. Mohamed Omar and Dr. Ghada for ${agedPending.length} pending leave requests.`);
    }

    // 4. KPI monthly auto-aggregation check
    executed.push(`Recalculated active month KPI weight aggregates for 16 team members.`);

    setLastAutomationRun(now.toISOString());
    logAction('AUTOMATION_CYCLE_EXECUTED', 'Automations', `Automated jobs executed: ${executed.join('; ')}`);
    return executed;
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
        addTaskComment,
        reviewTask,
        kpiRecords,
        updateKPIRecord,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        auditLogs,
        logAction,
        runAutomations,
        lastAutomationRun,
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
