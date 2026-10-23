import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PERMISSION_MATRIX, INITIAL_USERS } from '../src/data/seedData.ts';
import { calculateHaversineDistanceMeters, evaluateGeofence } from '../src/utils/geoUtils.ts';
import { canSubmitOwnLeave, getLeaveApprovers, isLeaveExempt, isLeaveObserver } from '../src/utils/leavePolicy.ts';

const userByEmail = (email: string) => {
  const user = INITIAL_USERS.find((candidate) => candidate.email === email);
  assert.ok(user, `Missing seeded user ${email}`);
  return user;
};

test('geofence distance and boundary decisions are deterministic', () => {
  assert.equal(calculateHaversineDistanceMeters(30.0444, 31.2357, 30.0444, 31.2357), 0);
  const zone = { id: 'hq', nameEn: 'HQ', nameAr: 'المقر', latitude: 30.0444, longitude: 31.2357, radiusMeters: 500, isActive: true, isPrimary: true };
  assert.equal(evaluateGeofence(30.0444, 31.2357, [zone]).isInside, true);
  assert.equal(evaluateGeofence(30.1444, 31.3357, [zone]).isInside, false);
  assert.equal(evaluateGeofence(30.0444, 31.2357, [{ ...zone, isActive: false }]).isInside, false);
});

test('executive exempt accounts cannot submit employee leave', () => {
  for (const email of ['m.badawy@geoinformatics.com', 'amr.soghayar@geoinformatics.com']) {
    const user = userByEmail(email);
    assert.equal(isLeaveExempt(user), true);
    assert.equal(canSubmitOwnLeave(user), false);
  }
});

test('co-founders are monitoring-only and never enter approval chains', () => {
  for (const email of ['m.omar@geoinformatics.com', 'dr.ghada@geoinformatics.com']) {
    const user = userByEmail(email);
    assert.equal(isLeaveObserver(user), true);
    assert.equal(canSubmitOwnLeave(user), false);
    assert.deepEqual(getLeaveApprovers(user, INITIAL_USERS), []);
  }
});

test('GIS leave requires the three company approvers plus the GIS head', () => {
  const requester = INITIAL_USERS.find((user) => user.departmentId === 'gis' && user.roleId === 'gis_specialist');
  assert.ok(requester);
  const approvers = getLeaveApprovers(requester, INITIAL_USERS);
  assert.deepEqual(new Set(approvers.map((user) => user.roleId)), new Set(['ceo', 'admin_manager', 'tech_manager', 'gis_manager']));
  assert.equal(approvers.some((user) => user.roleId === 'co_founder'), false);
});

test('monitoring-only co-founders have no task mutation rights', () => {
  assert.equal(DEFAULT_PERMISSION_MATRIX.co_founder.tasks.view, false);
  assert.equal(DEFAULT_PERMISSION_MATRIX.co_founder.tasks.create, false);
  assert.equal(DEFAULT_PERMISSION_MATRIX.co_founder.tasks.edit, false);
  assert.equal(DEFAULT_PERMISSION_MATRIX.co_founder.tasks.approve, false);
  assert.equal(DEFAULT_PERMISSION_MATRIX.co_founder.tasks.manage, false);
});
