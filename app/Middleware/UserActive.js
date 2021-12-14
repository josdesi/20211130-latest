'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const {  userStatus } = use('App/Helpers/Globals');

class UserActive {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle ({ auth, response }, next) {
    const user = await auth.getUser()
    const res = await this.validateStatus(user);
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
  async wsHandle ({ user }, next) {
    const res = await this.validateStatus(user);
    if(!res.success){
      throw new Error(res.error.message);
    }
    // call next to advance the request
    await next()
  }

  async validateStatus(user){
    if(!user || user.user_status_id === userStatus.Inactive){
      return{
        success:false,
        code: 403,
        error:{
          message:"Your account doesn't have the permissions to use the resource",
          isInactive:true,
          redirect:true
        }
      }
    }
    return {
      success: true
    }
  }
}

module.exports = UserActive
