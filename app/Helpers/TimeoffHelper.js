'use strict';

const moment = use('moment');
const Holiday = use('App/Models/Holiday');

const sunday = 6;
const saturday = 0;

class TimeoffHelper {
  /**
   * Creates a new TimeoffHelper.
   * @constructor
   * @param {Object} timeOffConfiguration Object containing an holidays<Date>,
   * the cutoffTime in HH:mm format, and timezone according to IANA time zone database (https://momentjs.com/timezone/docs/#/using-timezones/getting-zone-names/)
   * and a safeThreshold to add some hours to track always in the morning and avoid problems when switching TZs
   */
  constructor(timeOffConfiguration) {
    if (!timeOffConfiguration) throw 'TimeoffHelper config should be specified';
    if (!timeOffConfiguration.cutoffTime || !timeOffConfiguration.timezone)
      throw 'Tracking TZ and cut off time should be specified';

    this.holidays = timeOffConfiguration.holidays;
    this.cutoffTime = timeOffConfiguration.cutoffTime;
    this.timezone = timeOffConfiguration.timezone;
    this.safeThreshold = timeOffConfiguration.safeThreshold || 6;
  }

  momentInTrackingTZ(date) {
    if (!date) throw 'Invalid parameters for date or timezone';
    return moment.tz(date, this.timezone);
  }

  async loadHolidays() {
    if (!this.holidays) {
      const holidays = await Holiday.query().select(['date']).orderBy('date', 'desc').fetch();
      this.holidays = holidays.toJSON().map(({ date }) => new Date(date));
    }
  }

  /**
   * Check if a date is a holiday according to holidays'list
   * @param {Date} Date to check -assuming utc-
   * @returns {bool} Whether is a holiday or not
   */
  async isHoliday(date) {
    if (!date) throw 'Invalid date';

    await this.loadHolidays();

    const dateInTrackingTZ = this.momentInTrackingTZ(date).startOf('day');
    const compareFormat = 'YYYYMMDD';
    return this.holidays.some(
      (holiday) => moment(holiday).format(compareFormat) === dateInTrackingTZ.format(compareFormat)
    );
  }

  /**
   * Check if a date is a day off -holiday or weekend-
   * @param {Date} Date to check
   * @returns {bool} Whether is a day off or not
   */
  async isDayOff(date) {
    if (!date) throw 'Invalid date';

    await this.loadHolidays();

    const dayOfWeek = this.momentInTrackingTZ(date).day();
    const isWeekend = dayOfWeek === sunday || dayOfWeek === saturday;

    return isWeekend || (await this.isHoliday(date));
  }

  /**
   * Check if a date is a weekday
   * @param {Date} Date to check
   * @returns {bool} Whether is a weekday or not
   */
  isWeekday(date) {
    if (!date) throw 'Invalid date';

    const dayOfWeek = this.momentInTrackingTZ(date).day();
    return dayOfWeek !== sunday && dayOfWeek !== saturday;
  }

  /**
   * Get the next business day of a date
   * @param {Date} Day to get the following business day from  -utc-
   * @returns {Date} The following business day
   */
  async getNextBusinessDay(date) {
    if (!date) throw 'Invalid date';

    const nextDayInTrackingTZ = this.momentInTrackingTZ(date)
      .add(1, 'days')
      .startOf('day')
      .add(this.safeThreshold, 'hours');
    const nextDayInUTC = nextDayInTrackingTZ.utc().toDate();
    const isDayOff = await this.isDayOff(nextDayInUTC);

    return isDayOff ? await this.getNextBusinessDay(nextDayInUTC) : nextDayInUTC;
  }

  /**
   * Check if a date is after a cut off according to {@param timeOffConfiguration.cutoffTime} and {@param timeOffConfiguration.timezone}
   * @param {Date} Day to get the following business day from -utc-
   * @returns {bool} Whether is after the cutoff time
   */
  isAfterCutOff(date) {
    if (!date) throw 'Invalid date';

    const dateInTrackingTimezone = moment.tz(date, this.timezone);
    const cutoffHour = moment(this.cutoffTime, ['H:m', 'h:m a']);
    const cuttOffMoment = dateInTrackingTimezone
      .clone()
      .startOf('day')
      .set({ hour: cutoffHour.get('hour'), minute: cutoffHour.get('minute') });

    return dateInTrackingTimezone.isAfter(cuttOffMoment);
  }

  /**
   * Get tracking date considering days off and cut off time
   * @param {Date} Date to check if should  be tracked according to tracking rules
   * @returns {Date} Tracking date as next business day considering days off and cut off time
   */
  async getBoardDate(date) {
    if (!date) throw 'Invalid date';

    await this.loadHolidays();

    const isDayOff = await this.isDayOff(date);
    const shouldTrackInNextBusinessDay = isDayOff || (this.isWeekday(date) && this.isAfterCutOff(date));
    if (shouldTrackInNextBusinessDay) {
      return await this.getNextBusinessDay(date);
    } else {
      const dateWithThreshold = this.momentInTrackingTZ(date).startOf('day').add(this.safeThreshold, 'hours').toDate();
      return dateWithThreshold;
    }
  }

  isMonday() {
    return new Date().getDay() === 1;
  }
}

module.exports = TimeoffHelper;
