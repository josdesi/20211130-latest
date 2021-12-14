'use strict'

class BulkDashboardFilters {
  get sanitizationRules() {
    return {
      allRecruiters: 'to_boolean'
    };
  }
}

module.exports = BulkDashboardFilters
