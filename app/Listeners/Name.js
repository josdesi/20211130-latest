'use strict';

//Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const NameDirectoryUpdater = new (use('App/Helpers/NameDirectoryUpdater'))();
const NameRepository = new (use('App/Helpers/NameRepository'))();
const extractId = ({name, nameId, id}) => {
  if (id) return id;
  if (nameId) return nameId;
  if (name && name.id) return name.id;
};
const Name = {
  updateActivityTableThenDirectory: async (params) => {
    try {
      const id = extractId(params);
      await NameRepository.refreshLastActivityDateTableById(id);
      await Name.updateOrCreateDirectoryInformation(params);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  updateBatchActivityTableThenDirectory: async ({ nameIds = 0 }) => {
    try {
      if (nameIds.length <= 0) return;
      await NameRepository.refreshLastActivityDateTableByBatchIds(nameIds);
      await Name.updateOrCreateDirectoryInformation({ nameIds });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  updateOrCreateDirectoryInformation: async(params) => {
    try {
      const { nameIds = [] } = params;
      const id = extractId(params);
      if (!id && nameIds.length === 0) return;
      if(id) await NameDirectoryUpdater.updateOrCreateDirectoryInformation(id);
      if(nameIds.length > 0){
        for(const _id of nameIds){
          await NameDirectoryUpdater.updateOrCreateDirectoryInformation(_id);
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
      await NameDirectoryUpdater.deleteDirectoryInformation(id);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateSearchableText: async(params) => {
    try {
      const id = extractId(params);
      const query = `
        UPDATE
          names
        SET
          searchable_text = CONCAT(full_name, ' ', email, ' ', title),
          document_tokens = TO_TSVECTOR('simple', CONCAT(full_name, ' ', email, ' ', title))
        FROM
          personal_informations pi
        WHERE
          pi.id = names.personal_information_id
        AND
          names.id = ?
      `;
      await Database.raw(query, [id]);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
};

module.exports = Name;
