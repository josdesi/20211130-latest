'use strict';

//Utils
const appInsights = require('applicationinsights');
const HiringAuthorityDirectoryUpdater = new (use('App/Helpers/HiringAuthorityDirectoryUpdater'))();
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const extractId = ({hiringAuthority, id, hiringAuthorityId}) => {
  if (hiringAuthorityId) return hiringAuthorityId;
  if (id) return id;
  if (hiringAuthority && hiringAuthority.id) return hiringAuthority.id;
}
const HiringAuthority = {
  updateActivityTableThenDirectory: async (params) => {
    try {
      const id = extractId(params);
      await HiringAuthorityRepository.refreshLastActivityDateTableById(id);
      await HiringAuthority.updateOrCreateDirectoryInformation(params);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  updateBatchActivityTableThenDirectory: async ({ hiringAuthorityIds = 0 }) => {
    try {
      if (hiringAuthorityIds.length <= 0) return;
      await HiringAuthorityRepository.refreshLastActivityDateTableByBatchIds(hiringAuthorityIds);
      await HiringAuthority.updateOrCreateDirectoryInformation({ hiringAuthorityIds });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  updateOrCreateDirectoryInformation: async(params) => {
    try {
      const { hiringAuthorityIds = [] } = params;
      const id = extractId(params);
      if (!id && hiringAuthorityIds.length === 0) return;
      if(id) await HiringAuthorityDirectoryUpdater.updateOrCreateDirectoryInformation(id);
      if(hiringAuthorityIds.length > 0){
        for(const _id of hiringAuthorityIds){
          await HiringAuthorityDirectoryUpdater.updateOrCreateDirectoryInformation(_id);
        }
      }
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  deleteDirectoryInformation: async (params) => {
    try {
      const id = extractId(params);
      if (!id) return;
      await HiringAuthorityDirectoryUpdater.deleteDirectoryInformation(hiringAuthority.id);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
};

module.exports = HiringAuthority;
