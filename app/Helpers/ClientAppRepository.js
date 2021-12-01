//Utils
const Env = use('Env');
const Database = use('Database');
const crypto = require('crypto');
const { clientAppStatuses } = use('App/Helpers/Globals');

class ClientAppRepository {
  /**
   * Method to check if an external app has previously registered in our client app registrations
   * 
   * @param {String} clientId
   * @param {String} clientSecret
   * 
   * @return {Boolean} is registered
   */
   async authClientApp(clientId, clientSecret){
    if ( !clientId || !clientSecret) return false;
    const key = Env.get('APP_KEY');
    const hashSecret = crypto.createHmac('sha256', key)
      .update(clientSecret)
      .digest('hex')
      .toString();
    
    const query = Database.table('client_app_registrations')
      .select('client_id')
      .where('client_id', clientId)
      .where('client_secret_app', hashSecret)
      .where('available', clientAppStatuses.Active)
      .first();

    return !!(await query);
  }
}

module.exports = ClientAppRepository;