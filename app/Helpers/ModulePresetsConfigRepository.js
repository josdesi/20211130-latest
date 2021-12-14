'use strict';

const appInsights = require('applicationinsights');
const ModulePresetsConfig = use('App/Models/ModulePresetsConfig');

class ModulePresetsConfigRepository {
  async getById(id) {
    try {
      return await ModulePresetsConfig.findOrFail(id);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      if (error.name === 'ModelNotFoundException') return null;
    }
  }
}

module.exports = ModulePresetsConfigRepository;
