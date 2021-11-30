'use strict'

const { ServiceProvider } = require('@adonisjs/fold')

class ArrayOfDatesValidationProvider extends ServiceProvider {

  async _arrayOffDates(data, field, message, args, get) {
    const dates = get(data, field)
    const isoStringDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/
    const defaultMessage = 'All items on array must be ISO formatted dates or null'
    let validDatesCount = 0
    if (!(dates instanceof Array)) {
      throw 'Array of dates must be an array'
    }
    dates.forEach(date => {
      const parsedDate = new Date(date)
      if (date == null) {
        return
      }
      if (!isoStringDateRegex.test(date) || parsedDate.toISOString() !== date) {
        throw message || defaultMessage
      }
      validDatesCount++;
    })
    if (args.length > 0 && args[0] && validDatesCount != 3) {
      throw message || defaultMessage
    }
  }
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    //
  }

  /**
   * Attach context getter when all providers have
   * been registered
   *
   * @method boot
   *
   * @return {void}
   */
  boot () {
    const Validator = use('Validator')
    Validator.extend('arrayOfDates', this._arrayOffDates, 'All elements of array must be ISO formatted date strings')
  }
}

module.exports = ArrayOfDatesValidationProvider
