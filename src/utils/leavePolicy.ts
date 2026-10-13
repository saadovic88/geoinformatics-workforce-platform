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

const DEPARTMENT_HEAD_ROLE: Partial<Record<DepartmentId, User['roleId']>> = {
  administrative: 'admin_manager',
  technical: 'tech_manager',
  training: 'training_manager',
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
 * Every request needs the three company approvers (CEO, administration and
 * technical managers) plus its department head where that person is distinct.
 * Repeated people are de-duplicated for Administrative/Technical requests.
 */
export const getLeaveApprovers = (requester: User | undefined, users: User[]): User[] => {
  if (!requester || !canSubmitOwnLeave(requester)) return [];

  const companyApprovers = ['ceo', 'admin_manager', 'tech_manager'] as const;
  const departmentHeadRole = DEPARTMENT_HEAD_ROLE[requester.departmentId];
  const roleSequence = departmentHeadRole
    ? [...companyApprovers, departmentHeadRole]
    : [...companyApprovers];

  return roleSequence
    .map((role) => users.find((user) => user.roleId === role))
    .filter((user): user is User => !!user && user.id !== requester.id)
    .filter((user, index, list) => list.findIndex((candidate) => candidate.id === user.id) === index);
};

