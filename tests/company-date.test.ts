import assert from 'node:assert/strict';
import test from 'node:test';
import { addCompanyDays, companyDate, isCompanyDate, isCompanyDateRange } from '../src/utils/companyDate.ts';

test('company calendar emits a stable Cairo YYYY-MM-DD value', () => {
  assert.equal(companyDate(new Date('2026-10-27T22:30:00.000Z')), '2026-10-28');
  assert.equal(companyDate(new Date('2026-10-27T20:30:00.000Z')), '2026-10-27');
});

test('company date validation rejects invalid and reversed calendar ranges', () => {
  assert.equal(isCompanyDate('2026-02-29'), false);
  assert.equal(isCompanyDate('2028-02-29'), true);
  assert.equal(isCompanyDateRange('2026-10-28', '2026-10-27'), false);
  assert.equal(isCompanyDateRange('2026-10-28', '2026-10-28'), true);
  assert.equal(addCompanyDays('2026-10-28', 7), '2026-11-04');
});
