'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const ClientAppRepository = new (use('App/Helpers/ClientAppRepository'))();

/**
 * ClientAppAuthentication middleware protects routes by ensuring that an external app has previously
 * been registered in our client app registrations
 */
class ClientAppAuthentication {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle ({ response, request }, next) {
    const clientId = request.header('clientId');
    const clientSecret = request.header('clientSecret');

    const isClientAppAuth = await ClientAppRepository.authClientApp(clientId, clientSecret);
    if (!isClientAppAuth) {
      return response.status(401).send({
        message: 'Please provide valid client app credentials',
        redirect: false,
      });
    }

    // call next to advance the request
    await next()
  }
}

module.exports = ClientAppAuthentication
