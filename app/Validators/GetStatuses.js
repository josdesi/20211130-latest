'use strict';

class GetStatuses {
  get sanitizationRules() {
    return {
      selectable: 'to_boolean'
    };
  }
}

module.exports = GetStatuses;
