'use strict';

class ConvertEmptyStringsToNull {
  async handle({ request }, next) {
    request.body = this.assignValue(request.body);
    await next();
  }

  assignValue(value) {
    while (value && Object.keys(value).length && typeof value !== 'string' && typeof value !== 'number') {
      if (!Array.isArray(value)) {
        value = Object.assign(
          ...Object.keys(value).map((key) => ({
            [key]: this.assignValue(value[key]),
          }))
        );
      } else {
        value = value.map((data) => {
          return this.assignValue(data);
        });
      }
    }
    return value !== '' 
            ? (typeof value === 'string' ? value.trim() : value) 
            : null;
  }
}

module.exports = ConvertEmptyStringsToNull;
