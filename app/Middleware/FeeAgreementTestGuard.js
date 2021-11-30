'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */
const UserRepository =  new (use('App/Helpers/UserRepository'))();
const { userPermissions } = use('App/Helpers/Globals');
class FeeAgreementTestGuard {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle ({ auth, response }, next) {
    const user = await auth.getUser();
    const hasPermission = await UserRepository.hasPermission(user.id, userPermissions.newFeeAgreements.use);
    if(!hasPermission){
      return response.status(403).send({
        message: `You're not allowed to use this module yet`,
        isInactive:true,
        redirect:true
      });
    }
    // call next to advance the request
    await next()
  }
}

module.exports = FeeAgreementTestGuard
