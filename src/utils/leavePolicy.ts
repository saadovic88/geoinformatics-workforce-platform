import { DepartmentId, User } from '../types';

/** Leaders whose work pattern is not governed by the employee leave clock. */
const LEAVE_EXEMPT_EMAILS = new Set([
  'm.badawy@geoinformatics.com',
  'amr.soghayar@geoinformatics.com',
]);

/** Observers may monitor their own information only; they never administer it. */
const READ_ONLY_OBSERVER_EMAILS = new Set([
  'm.omar@geoinformatics.com',
  'dr.ghada@geoinformatics.com',
]);

const DEPARTMENT_OWNER_ROLE: Partial<Record<DepartmentId, User['roleId']>> = {
  administrative: 'admin_manager',
  technical: 'tech_manager',
  training: 'tech_manager',
  gis: 'gis_manager',
  remote_sensing: 'rs_manager',
};

export const isLeaveExempt = (user: User | undefined) =>
  !!user && LEAVE_EXEMPT_EMAILS.has(user.email.toLowerCase());

export const isLeaveObserver = (user: User | undefined) =>
  !!user && READ_ONLY_OBSERVER_EMAILS.has(user.email.toLowerCase());

export const canSubmitOwnLeave = (user: User | undefined) =>
  !!user && !isLeaveExempt(user) && !isLeaveObserver(user);

/**
 * Returns the single accountable department approver. A department lead's
 * personal request is escalated to the CEO as a narrow leadership exception;
 * routine employee requests never reach the CEO.
 */
export const getLeaveApprover = (requester: User | undefined, users: User[]): User | undefined => {
  if (!requester || !canSubmitOwnLeave(requester)) return undefined;

  const ownerRole = DEPARTMENT_OWNER_ROLE[requester.departmentId];
  const departmentOwner = ownerRole ? users.find((user) => user.roleId === ownerRole) : undefined;
  if (departmentOwner && departmentOwner.id !== requester.id) return departmentOwner;

  return users.find((user) => user.roleId === 'ceo' && user.id !== requester.id);
};

