'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */
const Config = use('Adonis/Src/Config');
class RemoteTaskAuth {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle ({ request, response }, next, permissions) {
    try {
      const authToken = request.header('Authorization');
      const realToken = Config.get('remoteTaskAuth.token');
      if (!(realToken != '' && authToken != '' && (authToken == realToken))) {
        return response.status(401).send({
          message:"Please provide the valid auth token",
          redirect:false
       });
      }
      await next();
    }catch(error) {
      return response.status(500).send({
        message: "Internal server error",
        redirect:false
      });
    }
    
  }
}

module.exports = RemoteTaskAuth
