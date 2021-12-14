'use strict'

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env')

module.exports = {
  baseUrl: Env.get('INSTANT_MESSAGING_API_URL', 'https://hooks.glip.com/webhook/v2')
}
