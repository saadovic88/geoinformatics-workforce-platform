export type RoleId = 
  | 'ceo'
  | 'co_founder'
  | 'admin_manager'
  | 'tech_manager'
  | 'gis_manager'
  | 'training_manager'
  | 'rs_manager'
  | 'senior_specialist'
  | 'gis_specialist'
  | 'rs_specialist'
  | 'admin_specialist'
  | 'hr_officer'
  | 'sys_admin';

export type DepartmentId = 
  | 'executive'
  | 'management'
  | 'gis'
  | 'remote_sensing'
  | 'training'
  | 'technical'
  | 'administrative'
  | 'hr';

export type AttendanceStatus = 
  | 'present_inside'
  | 'remote_approved'
  | 'external_approved'
  | 'outside_review'
  | 'outside_exception'
  | 'late'
  | 'absent'
  | 'on_leave';

export type LeaveType = 
  | 'annual'
  | 'casual'
  | 'sick'
  | 'emergency'
  | 'unpaid'
  | 'wfh'
  | 'external_site'
  | 'late_arrival'
  | 'early_leave'
  | 'short_hourly';

export type LeaveStatus = 
  | 'pending_approval'
  | 'partially_approved'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type TaskStatus = 
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'submitted'
  | 'needs_revision'
  | 'completed'
  | 'cancelled'
  | 'overdue';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  employeeCode: string;
  username: string;
  nameEn: string;
  nameAr: string;
  email: string;
  phone: string;
  jobTitleEn: string;
  jobTitleAr: string;
  roleId: RoleId;
  departmentId: DepartmentId;
  managerId?: string;
  status: 'active' | 'inactive';
  avatarUrl: string;
  joiningDate: string;
  workScheduleId: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  lastLogin?: string;
  firstLoginPasswordChanged?: boolean;
}

export interface GeofenceZone {
  id: string;
  nameEn: string;
  nameAr: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  isPrimary: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm:ss
  checkOutTime?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  distanceMeters?: number;
  status: AttendanceStatus;
  statusNotes?: string;
  totalDurationMinutes: number;
  breakDurationMinutes: number;
  netWorkedHours: number;
  requiredDailyHours: number;
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  source: 'auto_login' | 'manual' | 'mobile' | 'system_close';
  evidenceUrl?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface LeaveBalance {
  employeeId: string;
  leaveType: LeaveType;
  entitlement: number; // in days (or hours for hourly)
  used: number;
  pending: number;
  remaining: number;
  carriedOver: number;
  unit: 'days' | 'hours';
}

export interface LeaveApprovalStep {
  approverId: string; // 'emp_omar' or 'emp_ghada' or custom
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  actionDate?: string;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  durationUnits: number; // days or hours
  unit: 'days' | 'hours';
  reason: string;
  notes?: string;
  attachmentName?: string;
  handoverNotes?: string;
  contactWhileAway?: string;
  /** Colleague assigned to cover the requester's work during the absence. */
  proxyEmployeeId?: string;
  status: LeaveStatus;
  createdAt: string;
  // Dual approval steps
  approvalSteps: LeaveApprovalStep[];
  // External site specifics
  externalSiteDetails?: {
    clientName: string;
    projectName: string;
    siteLocation: string;
    latitude?: number;
    longitude?: number;
    visitNotes?: string;
  };
}

export interface TaskSubtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  fileType: 'image' | 'pdf' | 'spreadsheet' | 'gis_shapefile' | 'link';
  size?: string;
  url: string;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectName: string;
  departmentId: DepartmentId;
  creatorId: string;
  assigneeIds: string[];
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  deadlineTime: string;
  estimatedHours: number;
  actualHours: number;
  progressPercent: number;
  notes?: string;
  subtasks: TaskSubtask[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  activityLogs: TaskActivity[];
  reviewScore?: number; // 0-100
  managerReviewNotes?: string;
}

export interface KPICategoryScore {
  category: 'attendance' | 'work_performance' | 'behavior' | 'self_development';
  weight: number; // 20, 40, 20, 20
  scoreOutOfWeight: number; // e.g. 18.5 / 20
  scorePercentage: number; // e.g. 92.5%
  managerNotes?: string;
  metrics: Record<string, number | string>;
}

export interface MonthlyKPIRecord {
  id: string;
  employeeId: string;
  year: number;
  month: number; // 1 - 12
  attendanceScore: KPICategoryScore;
  workScore: KPICategoryScore;
  behaviorScore: KPICategoryScore;
  selfDevScore: KPICategoryScore;
  totalScore: number; // Sum of 4 weighted scores out of 100
  status: 'draft' | 'submitted' | 'published';
  publishedAt?: string;
  /** The named leader who submitted this independent monthly evaluation. */
  evaluatorId?: string;
  reviewedBy?: string;
  evidenceLinks: { title: string; url: string; category: string }[];
}

export interface NotificationItem {
  id: string;
  userId: string; // or 'all'
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  type: 'attendance' | 'leave' | 'task' | 'kpi' | 'system' | 'geofence';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface WorkSchedule {
  id: string;
  nameEn: string;
  nameAr: string;
  requiredDailyHours: number;
  officialStartTime: string; // 09:00
  officialEndTime: string; // 17:00
  breakDurationMinutes: number; // 60
  gracePeriodMinutes: number; // 15
  workingDays: number[]; // 0=Sunday, 1=Monday... in Egypt GIS week is Sun-Thu typically: [0, 1, 2, 3, 4]
  /** Archived schedules remain in the company record but are no longer selectable. */
  archivedAt?: string;
}

export interface Holiday {
  id: string;
  nameEn: string;
  nameAr: string;
  date: string;
  isRecurring: boolean;
  /** Archived holidays remain in the company record but are not applied. */
  archivedAt?: string;
}

export interface PermissionModuleAction {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
  manage: boolean;
}

export type PermissionMatrix = Record<string, Record<string, PermissionModuleAction>>;
