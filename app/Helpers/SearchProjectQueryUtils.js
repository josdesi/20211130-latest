'use strict';

const { SearchProjectTypes, nameStatus } = use('App/Helpers/Globals');
const candidateIds = [SearchProjectTypes.Candidate, SearchProjectTypes.NameCandidate];
const haIds = [SearchProjectTypes.HiringAuthority, SearchProjectTypes.NameHA];

const methods = {
  searchProjectItemTypeResolver: async function ({ query, column, value }) {
    const searchProjectTypeIds = [];
    const passedIds = value && Array.isArray(value) ? value : [value];

    for (const id of passedIds) {
      switch (Number(id)) {
        case SearchProjectTypes.Candidate:
          searchProjectTypeIds.push(...candidateIds);
          break;

        case SearchProjectTypes.HiringAuthority:
          searchProjectTypeIds.push(...haIds);
          break;

        default:
          searchProjectTypeIds.push(id);
          break;
      }
    }

    query.whereIn(column, searchProjectTypeIds);
  },

  async searchProjectItemStatusResolver({ column, query, value }) {
    const itemStatusIds = [];
    const passedIds = value && Array.isArray(value) ? value : [value];

    for (const id of passedIds) {
      switch (Number(id)) {
        case nameStatus.Candidate.Ongoing:
          itemStatusIds.push(id, nameStatus.Name.Candidate);
          break;

        case nameStatus.Candidate.Unqualified:
          itemStatusIds.push(id, nameStatus.Name.Candidate);
          break;

        default:
          itemStatusIds.push(id);
          break;
      }
    }

    query.whereIn(column, itemStatusIds);
  },
};

module.exports = methods;
