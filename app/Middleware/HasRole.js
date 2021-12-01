'use strict'
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

const { userRoles } = use('App/Helpers/Globals');
const Database = use('Database');

/**
 * HasRole middleware protects the Routes ensuring a user has the respective role
 * before the request reaches the controller.
 *
 * ```
 * Route
 * .get('...')
 * .middleware('hasRole')
 * ```
 *
 * You can define one or multiple roles to be tried.
 * ```
 * Route
 * .get('...')
 * .middleware('hasRole:Recruiter,Coach')
 * ```
 *
 * @class HasRole
 * @constructor
 */
class HasRole {

  constructor () {
    this.role = userRoles.Recruiter;
  }

    /**
   * Validates the user using one of the defined
   * roles or the default role
   *
   * @method handle
   * @async
   *
   * @param {Object}   ctx       Request context
   * @param {Function} next
   * @param {Array}    roles     Roles for which the user must be validated.
   *                             If no role is defined, then default role is used.
   *
   * @return {Response|Void}
   */
  async handle ({ auth, response }, next, roles) {
    const user = await auth.getUser();
    const res = await this.validateRoles(user, roles);
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
  async wsHandle ({ user }, next, roles) {
    const res = await this.validateRoles(user, roles);
    if(!res.success){
      throw new Error(res.error.message);
    }
    // call next to advance the request
    await next()
  }
  

  async validateRoles(user, roles){
    const _roles = Array.isArray(roles) && roles.length ? roles : [this.role]
    const userRoles = await this._hasRoles(user.id,_roles);
    if(userRoles.length === 0){
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
   * Validates the user role
   *
   * @method _hasRoles
   *
   * @param  {Object}      userId
   * @param  {Array}      role
   *
   * @return {void}
   */
  _hasRoles(userId, roles){
    return  Database.table('roles')
      .select('roles.title')
      .innerJoin('user_has_roles as ur','roles.id','ur.role_id')
      .where('user_id',userId)
      .whereIn('roles.title',roles);
  }
}

module.exports = HasRole
