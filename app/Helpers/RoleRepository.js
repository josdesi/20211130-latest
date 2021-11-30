'use strict';
//Models
const Role = use('App/Models/Role');
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();

//Utils
const appInsights = require('applicationinsights');
const { userRoles } = use('App/Helpers/Globals');

class RoleRepository {
  /**
   * Show a list of roles
   *
   * @param {String} filter
   *
   * @return {Object} Role list with a succes message or an error code
   *
   */
  async listing({ filter }) {
    try {
      const result = filter === 'roster' ? await this.getRosterRoles() : await Role.query().where('id','!=',userRoles.Admin).fetch();

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem retrieving the users roles',
      };
    }
  }

  async getRosterRoles() {
    const result = await ModulePresetsConfigRepository.getById('rosterRoles');
    return result.data;
  }
}

module.exports = RoleRepository;
