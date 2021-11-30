'use strict';
const { test, before } = use('Test/Suite')('Timeoff Helper');
const moment = use('moment');
const TimeoffHelper = use('App/Helpers/TimeoffHelper');

const holidays = [
  new Date('2022-01-01T00:00:00.00'),
  new Date('2021-12-27T00:00:00.00'),
  new Date('2021-12-24T00:00:00.00'),
  new Date('2021-11-26T00:00:00.00'),
  new Date('2021-11-25T00:00:00.00'),
];

const cutoffTimezone = 'America/Chicago';
const cutoffTime = '20:00';

let timeoffHelper = null;
before(() => {
  timeoffHelper = new TimeoffHelper({
    holidays,
    cutoffTime,
    timezone: cutoffTimezone,
    safeThreshold: 6,
  });
});

test('make sure a day is a holiday', async ({ assert }) => {
  assert.equal(await timeoffHelper.isHoliday(new Date('2022-01-01T06:00:00')), true);
  assert.equal(await timeoffHelper.isHoliday(new Date('2022-01-01T20:00:00')), true);
});

test('should throw if date is null', async ({ assert }) => {
  assert.plan(1);
  try {
    await timeoffHelper.isHoliday(null);
  } catch (error) {
    assert.equal(error, 'Invalid date');
  }
});

test('make sure a day is not a holiday', async ({ assert }) => {
  assert.equal(await timeoffHelper.isHoliday(new Date('2022-01-01T05:00:00')), false);
  assert.equal(await timeoffHelper.isHoliday(new Date('2021-09-21T17:00:00')), false);
});

test('make sure a holiday is day off', async ({ assert }) => {
  assert.equal(await timeoffHelper.isDayOff(new Date('2022-01-01T08:00:00')), true);
});

test('make sure a saturday or sunday are days off in CDT', async ({ assert }) => {
  assert.equal(await timeoffHelper.isDayOff(new Date('2021-09-18T05:00:00')), true);
  assert.equal(await timeoffHelper.isDayOff(new Date('2021-09-19T05:00:00')), true);
  assert.equal(await timeoffHelper.isDayOff(new Date('2021-09-18T06:00:00')), true);
  assert.equal(await timeoffHelper.isDayOff(new Date('2021-09-19T06:00:00')), true);
  assert.equal(await timeoffHelper.isDayOff(new Date('2021-09-21T18:00:00')), false);
});

test('make sure a saturday or sunday are days off in CST', async ({ assert }) => {
  assert.equal(await timeoffHelper.isDayOff(new Date('2021-11-20T06:00:00')), true);
  assert.equal(await timeoffHelper.isDayOff(new Date('2021-11-21T06:00:00')), true);
  assert.equal(await timeoffHelper.isDayOff(new Date('2021-11-20T05:00:00')), false);
});

test('make sure a day is a week day', async ({ assert }) => {
  assert.equal(await timeoffHelper.isWeekday(new Date('2021-09-20T04:00:00')), false);
  assert.equal(await timeoffHelper.isWeekday(new Date('2021-09-20T05:00:00')), true);
  assert.equal(await timeoffHelper.isWeekday(new Date('2021-09-20T10:00:00')), true);
  assert.equal(await timeoffHelper.isWeekday(new Date('2021-09-21T18:00:00')), true);
  assert.equal(await timeoffHelper.isWeekday(new Date('2021-09-17T07:00:00')), true);
});

const casesForNextBusinessDay = [
  { input: new Date('2021-09-21T18:00:00'), expected: new Date('2021-09-22T11:00:00') },
  { input: new Date('2021-09-21T00:00:00'), expected: new Date('2021-09-21T11:00:00') },
  { input: new Date('2021-09-18T21:00:00'), expected: new Date('2021-09-20T11:00:00') },
  { input: new Date('2021-09-17T21:00:00'), expected: new Date('2021-09-20T11:00:00') },
  { input: new Date('2021-12-24T10:00:00'), expected: new Date('2021-12-28T12:00:00') },
  { input: new Date('2021-12-24T00:00:00'), expected: new Date('2021-12-28T12:00:00') },
  { input: new Date('2021-12-25T00:00:00'), expected: new Date('2021-12-28T12:00:00') },
  { input: new Date('2021-11-24T10:00:00.00'), expected: new Date('2021-11-29T12:00:00') },
  { input: new Date('2021-11-27T10:00:00.00'), expected: new Date('2021-11-29T12:00:00') },
];

casesForNextBusinessDay.forEach(({ input, expected }) => {
  test(`make sure next business day of ${input} is ${expected}`, async ({ assert }) => {
    assert.equal((await timeoffHelper.getNextBusinessDay(input)).getTime(), expected.getTime());
  });
});

const casesAroundDLTChange = [
  { input: moment.utc('2021-11-06T00:01:00').toDate(), expected: false },
  { input: moment.utc('2021-11-06T01:01:00').toDate(), expected: true },
  { input: moment.utc('2021-11-09T01:01:00').toDate(), expected: false },
  { input: moment.utc('2021-11-09T02:01:00').toDate(), expected: true },
  { input: moment.utc('2021-11-09T02:01:00').toDate(), expected: true },
  { input: moment.utc('2021-09-21T19:00:00').toDate(), expected: false },
];

casesAroundDLTChange.forEach(({ input, expected }) => {
  test(`make sure ${input} cut off check is ${expected}`, async ({ assert }) => {
    assert.equal(timeoffHelper.isAfterCutOff(input), expected);
  });
});

const casesForTrackingDate = [
  { input: new Date('2021-09-21T20:10:00'), expected: new Date('2021-09-21T11:00:00') },
  { input: new Date('2021-09-22T02:00:00'), expected: new Date('2021-09-22T11:00:00') },
  { input: new Date('2021-11-24T23:00:00'), expected: new Date('2021-11-24T12:00:00') },
  { input: new Date('2021-11-25T02:10:00'), expected: new Date('2021-11-29T12:00:00') },
  { input: new Date('2021-11-25T01:50:00'), expected: new Date('2021-11-24T12:00:00') },
  { input: new Date('2021-12-24T03:00:00'), expected: new Date('2021-12-28T12:00:00') },
  { input: new Date('2021-09-22T16:00:00'), expected: new Date('2021-09-22T11:00:00') },
  { input: new Date('2021-09-22T23:00:00'), expected: new Date('2021-09-22T11:00:00') },
  { input: new Date('2021-09-23T00:30:00'), expected: new Date('2021-09-22T11:00:00') },
  { input: new Date('2021-09-23T01:30:00'), expected: new Date('2021-09-23T11:00:00') },
];

casesForTrackingDate.forEach(({ input, expected }) => {
  test(`tracking date from ${input} should be tracked ${expected}`, async ({ assert }) => {
    assert.equal((await timeoffHelper.getBoardDate(input)).getTime(), expected.getTime());
  });
});

test('should throw if no configuration provided', async ({ assert }) => {
  assert.plan(1);
  try {
    const invalidHelper = new TimeoffHelper();
  } catch (error) {
    assert.equal(error, 'TimeoffHelper config should be specified');
  }
});

test('should throw if no timezone or cutoff time provided', async ({ assert }) => {
  assert.plan(1);
  try {
    const invalidHelper = new TimeoffHelper({});
  } catch (error) {
    assert.equal(error, 'Tracking TZ and cut off time should be specified');
  }
});

const helperNoHolidays = new TimeoffHelper({
  cutoffTime,
  timezone: cutoffTimezone,
});

test('make sure holidays are loaded if werent provided', async ({ assert }) => {
  await helperNoHolidays.getBoardDate(new Date('2021-11-25T07:00:00'));

  assert.equal(helperNoHolidays.holidays && helperNoHolidays.holidays.length > 0, true);
});
