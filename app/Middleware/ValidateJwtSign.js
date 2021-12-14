'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */
const jwt = use('jsonwebtoken')
const Env = use('Env')
class ValidateJwtSign {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle ({ auth ,response }, next) {
    const token =await auth.getAuthHeader()
    try {
      jwt.verify(token,Env.get('PUBLIC_KEY').replace(/\\n/gm, '\n'))
    } catch (error) {
      if(error.name!="TokenExpiredError"){
        return response.status(400).send({
          message:error
        })
      }
    }
    // call next to advance the request
    await next()
   
  
  }
}

module.exports = ValidateJwtSign
