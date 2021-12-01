'use strict';
const { userFilters } = use('App/Helpers/Globals');
class FeeAmountConditionalFilters {
  isRecruiterCoachOrRegionalFilter(filters) {
    return (
      filters.userFilter == userFilters.Mine ||
      filters.userFilter == userFilters.MyTeam ||
      this.isCoach(filters) ||
      this.isRegionalDirector(filters) ||
      this.isRecruiter(filters)
    );
  }
  areThereMultipleRecruiters(filters) {
    return 'recruiterIds' in filters && filters.recruiterIds.length > 1;
  }
  isRecruiter(filters) {
    return (
      filters.userFilter == userFilters.Mine ||
      (Array.isArray(filters.recruiterIds)
        ? filters.recruiterIds.length > 0
        : 'recruiterIds' in filters && filters.recruiterIds != null)
    );
  }
  isRecruiterInventory(filters) {
    return filters.userFilter == userFilters.MyInventory;
  }
  isRegional(filters) {
    return filters.userFilter == userFilters.MyRegion;
  }
  isAllSendouts(filters) {
    return filters.userFilter == userFilters.All;
  }
  isCoach(filters) {
    return (
      (filters.userFilter == userFilters.MyTeam && this.isRecruiter(filters)) ||
      filters.userFilter == userFilters.MyTeam ||
      (Array.isArray(filters.coachIds)
        ? filters.coachIds.length > 0
        : 'coachIds' in filters && filters.coachIds != null)
    );
  }
  isRegionalDirector(filters) {
    return Array.isArray(filters.regionalDirectorIds)
      ? filters.regionalDirectorIds.length > 0
      : 'regionalDirectorIds' in filters && filters.regionalDirectorIds != null;
  }
}

class FeeAmountConditionalCopy extends FeeAmountConditionalFilters {
  copy = {
    recruiter:
      "These are your individual metrics. These metrics only gather the Fee amounts from Sendouts you created and the ones you're related with, considering your solos and your split estimations' percentage",
    recruiterInventory:
      "These are your inventory's metrics. These metrics gather the Fee amounts from all Sendouts in your inventory, considering your solos and your split estimations' percentage",
    coach:
      "These are your team's metrics. They consider the Fee amounts corresponding your team's Sendouts, considering their solos and their split estimations' percentage",
    generic:
      "These metrics only gather the Fee amounts from Sendouts related with the filters you've applied, considering the recruiters' solos and their split estimations' percentage",
  };

  getConditionalCopy(filters) {
    if (this.isAllSendouts(filters) || this.isRegional(filters)) return this.copy.generic;
    if (this.isCoach(filters)) return this.copy.coach;
    if (this.isRecruiter(filters)) return this.copy.recruiter;
    if (this.isRecruiterInventory(filters)) return this.copy.recruiterInventory;
    return this.copy.generic;
  }

  populateConditionalCopy(filters, summaryColumns) {
    for (const column of summaryColumns) {
      if (column.key === 'metrics') {
        column.copy = this.getConditionalCopy(filters);
      }
    }
  }
}

module.exports = {
  FeeAmountConditionalFilters,
  FeeAmountConditionalCopy,
};
