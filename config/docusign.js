'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  privateKey: (Buffer.from(Env.get('DOCUSIGN_PRIVATE_KEY', ''), 'base64')).toString('utf8'),
  publicKey: (Buffer.from(Env.get('DOCUSIGN_PUBLIC_KEY', ''), 'base64')).toString('utf8'),
  integrationKey: Env.get('DOCUSIGN_INTEGRATION_KEY', 'true'),
  accountId: Env.get('DOCUSIGN_ACCOUNT_ID', ''),
  apiUserId: Env.get('DOCUSIGN_API_USER_ID', ''),
  apiBaseUrl: Env.get('DOCUSIGN_API_BASE_URL', ''),
  oauthUrl:  Env.get('DOCUSIGN_OAUTH_URL', ''),
  webHookKey:  Env.get('DOCUSIGN_WEBHOOK_KEY', ''),
  adminDomain: Env.get('DOCUSIGN_ADMIN_DOMAIN', ''),
}