'use strict'
const ModulePresetsConfig = use('App/Models/ModulePresetsConfig');
const UserHasPermission = use('App/Models/UserHasPermission');
const { userPermissions } = use('App/Helpers/Globals');
class ModulePresetsConfigController {
  
  async putConfiguration({request, auth, response}) {
    const userId = auth.current.user.id;
    const userPermission = await UserHasPermission.query()
      .where('user_id', userId)
      .where('permission_id', userPermissions.modulePresetConfigs.manage)
      .first();
    if (!userPermission) {
      return response.status(403).send({code: 403, message: 'Current user has not access to this function'});
    }
    const {id, data} = request.only(['id', 'data']);
    const configuration = await ModulePresetsConfig.find(id);
    if (configuration) {
      configuration.data = data;
      await configuration.save();
      return response.status(200).send(configuration);
    }
    const result = await ModulePresetsConfig.create({id, data});
    return response.status(200).send(result);
  }

  async index({auth, response}) {
    const userId = auth.current.user.id;
    const userPermission = await UserHasPermission.query()
      .where('user_id', userId)
      .where('permission_id', userPermissions.modulePresetConfigs.manage)
      .first();
    if (!userPermission) {
      return response.status(403).send({code: 403, message: 'Current user has not access to this function'});
    }
    return response.status(200).send(await ModulePresetsConfig.query().fetch());
  }
}

module.exports = ModulePresetsConfigController
