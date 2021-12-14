'use strict';

class CustomString extends String {
  toCompare() {
    return this.toLowerCase().trim();
  }

  isEqualTo(value, { caseSensitive = false } = {}) {
    const currentValue = this;
    const targetValue = new CustomString(value);
    if (caseSensitive) return currentValue === targetValue;
    return currentValue.toCompare() === targetValue.toCompare();
  }
}

const _CustomString = CustomString;
CustomString = function (...args) {
  return new _CustomString(...args);
};
CustomString.prototype = _CustomString.prototype;

module.exports = CustomString;
