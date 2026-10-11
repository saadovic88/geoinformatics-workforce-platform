import { User, AttendanceRecord, LeaveRequest, LeaveBalance, Task, MonthlyKPIRecord } from '../types';

/**
 * Exports tabular data to CSV with UTF-8 BOM to properly display Arabic characters in Excel
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const processCell = (cell: string | number) => {
    const stringified = String(cell ?? '').replace(/"/g, '""');
    return `"${stringified}"`;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel Arabic support
    [
      headers.map(processCell).join(','),
      ...rows.map((row) => row.map(processCell).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports full data object as formatted JSON file
 */
export function exportToJSON(filename: string, data: any) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports comprehensive, multi-section 360° individual employee career dossier to CSV
 */
export function exportIndividualEmployeeDossierCSV(
  user: User,
  attendance: AttendanceRecord[],
  leaves: LeaveRequest[],
  balances: LeaveBalance[],
  tasks: Task[],
  kpi?: MonthlyKPIRecord
) {
  const safeStr = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines: string[] = [];

  // SECTION 1: Personal & Employment Details
  lines.push('\uFEFF=== GEOINFORMATICS WORKFORCE DOSSIER ===');
  lines.push(`Employee Name (AR),${safeStr(user.nameAr)}`);
  lines.push(`Employee Name (EN),${safeStr(user.nameEn)}`);
  lines.push(`Employee Code,${safeStr(user.employeeCode)}`);
  lines.push(`Job Title,${safeStr(user.jobTitleEn)} (${safeStr(user.jobTitleAr)})`);
  lines.push(`Department,${safeStr(user.departmentId)}`);
  lines.push(`Role,${safeStr(user.roleId)}`);
  lines.push(`Email Address,${safeStr(user.email)}`);
  lines.push(`Phone Number,${safeStr(user.phone)}`);
  lines.push(`Joining Date,${safeStr(user.joiningDate)}`);
  lines.push(`Status,${safeStr(user.status)}`);
  lines.push('');

  // SECTION 2: Leave Balances
  lines.push('=== LEAVE BALANCES (أرصدة الإجازات) ===');
  lines.push('Leave Type,Entitlement,Used Days,Pending Requests,Remaining Days,Unit');
  balances.forEach((b) => {
    lines.push(`${safeStr(b.leaveType)},${b.entitlement},${b.used},${b.pending},${b.remaining},${b.unit}`);
  });
  lines.push('');

  // SECTION 3: Recent Leave Requests
  lines.push('=== LEAVE & WFH REQUESTS (طلبات الإجازات والعمل عن بعد) ===');
  lines.push('ID,Type,Start Date,End Date,Units,Reason,Omar Status,Ghada Status,Final Status');
  leaves.forEach((l) => {
    const omarStatus = l.approvalSteps[0]?.status ?? 'n/a';
    const ghadaStatus = l.approvalSteps[1]?.status ?? 'n/a';
    lines.push(
      `${safeStr(l.id)},${safeStr(l.leaveType)},${safeStr(l.startDate)},${safeStr(l.endDate)},${l.durationUnits} ${safeStr(l.unit)},${safeStr(l.reason)},${safeStr(omarStatus)},${safeStr(ghadaStatus)},${safeStr(l.status)}`
    );
  });
  lines.push('');

  // SECTION 4: Assigned Spatial Projects & Tasks
  lines.push('=== ASSIGNED GIS & REMOTE SENSING TASKS (المهام ومشاريع GIS) ===');
  lines.push('Task ID,Project Name,Title,Priority,Status,Due Date,Progress (%),Est Hours,Logged Hours,Quality Score');
  tasks.forEach((t) => {
    lines.push(
      `${safeStr(t.id)},${safeStr(t.projectName)},${safeStr(t.title)},${safeStr(t.priority)},${safeStr(t.status)},${safeStr(t.dueDate)},${t.progressPercent}%,${t.estimatedHours},${t.actualHours},${t.reviewScore ?? 'N/A'}`
    );
  });
  lines.push('');

  // SECTION 5: Attendance Summary & Logs
  lines.push('=== ATTENDANCE RECORDS (سجلات الحضور والانصراف) ===');
  lines.push('Date,Check In,Check Out,Status,Notes,Net Hours,Required Hours,Overtime Hours');
  attendance.forEach((a) => {
    lines.push(
      `${safeStr(a.date)},${safeStr(a.checkInTime)},${safeStr(a.checkOutTime || '--')},${safeStr(a.status)},${safeStr(a.statusNotes || 'Standard')},${a.netWorkedHours},${a.requiredDailyHours},${a.overtimeHours}`
    );
  });
  lines.push('');

  // SECTION 6: KPI Performance Evaluation
  if (kpi) {
    lines.push('=== KPI PERFORMANCE EVALUATION (تقييم الأداء الشامل) ===');
    lines.push(`Month,${kpi.month}/2026`);
    lines.push(`Total KPI Score,${kpi.totalScore}%`);
    lines.push(`Attendance & Punctuality (Weight 20%),Score: ${kpi.attendanceScore.scoreOutOfWeight} / 20`);
    lines.push(`Work Output & Deliverables (Weight 40%),Score: ${kpi.workScore.scoreOutOfWeight} / 40`);
    lines.push(`Professional Behavior & Teamwork (Weight 20%),Score: ${kpi.behaviorScore.scoreOutOfWeight} / 20`);
    lines.push(`Self-Development & Skill Growth (Weight 20%),Score: ${kpi.selfDevScore.scoreOutOfWeight} / 20`);
    lines.push(`Manager Review Notes,${safeStr(kpi.workScore.managerNotes || 'Exceeds standard spatial production targets.')}`);
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Dossier_${user.employeeCode}_${user.nameEn.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers clean browser print dialog with styled printable sheet
 */
export function triggerPrintReport() {
  window.print();
}
