'use strict'
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

const Database = use('Database');

/**
 * HasPermission middleware protects the Routes ensuring a user has the respective permission
 * before the request reaches the controller.
 *
 * You can define one or multiple permissions to be tried.
 * ```
 * Route
 * .get('...')
 * .middleware('hasPermission:moduleContacts.usage,modulePresetConfigs.manage')
 * ```
 *
 * @class HasPermission
 * @constructor
 */
class HasPermission {

    /**
   * Validates the user using one of the defined
   * permissions
   *
   * @method handle
   * @async
   *
   * @param {Object}   ctx       Request context
   * @param {Function} next
   * @param {Array}    permissions  Permissions for which the user must be validated.                   
   *
   * @return {Response|Void}
   */
  async handle ({ auth, response }, next, permissions) {
    const user = await auth.getUser();
    const res = await this.validatePermissions(user, permissions);
    if(!res.success){
      return response.status(res.code).send(res.error);
    }
    // call next to advance the request
    await next()
  }


  
    /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
    async wsHandle ({ user }, next, permissions) {
      const res = await this.validatePermissions(user, permissions);
      if(!res.success){
        throw new Error(res.error.message);
      }
      // call next to advance the request
      await next()
    }

  async validatePermissions(user, permissions){
    const userPermissions = await this._hasPermissions(user.id,permissions);
    if(userPermissions.length === 0){
      return{
        success:false,
        code: 403,
        error:{
          message:"Your account doesn't have the permissions to use the resource",
          redirect:false
        }
      }
    }
    return {
      success: true
    }
  }
  
  /**
   * Validates the user permission
   *
   * @method _hasPermissions
   *
   * @param  {Object}     userId
   * @param  {Array}      permissions
   *
   * @return {void}
   */
  _hasPermissions(userId, permissions){
    return  Database.table('permissions')
      .select('permissions.title')
      .innerJoin('user_has_permissions as up','permissions.id','up.permission_id')
      .where('user_id',userId)
      .whereIn('permissions.title',permissions);
  }
}

module.exports = HasPermission
