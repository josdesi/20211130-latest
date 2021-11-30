'use strict'

//Utils
const appInsights = require('applicationinsights');
const Database = use ('Database');

class ChannelPartnerController {

  /**
   * Show a list of all channel partners.
   * GET channel-partners
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
   async index({ auth, params, response }) {
      try {
        const  userId  = params.id;
        const query = Database.table('channel_partners as chp');
        query
          .select([
            'chp.referral_id as user_referral_id',
            'chp.referee_id as user_referee_id',
            'referral_usr.initials as user_referral_initials',
            'referee_usr.initials as user_referee_initials',
            'referral_pi.full_name as user_referral_full_name',
            'referee_pi.full_name as user_referee_full_name',
            'chp.percent'
          ])
          .innerJoin('users as referral_usr', 'chp.referral_id', 'referral_usr.id')
          .innerJoin('users as referee_usr', 'chp.referee_id', 'referee_usr.id')
          .innerJoin('personal_informations as referral_pi', 'referral_usr.personal_information_id', 'referral_pi.id')
          .innerJoin('personal_informations as referee_pi', 'referee_usr.personal_information_id', 'referee_pi.id')
          .where('chp.referee_id', userId);

        const result = await query;

        return response.ok(result);
      } catch (error) {
        appInsights.defaultClient.trackException({ exception: error });

        return response.status(500).send({
          message: 'There was a problem getting the channel partner, please try again later',
        });
      }
   }
}

module.exports = ChannelPartnerController
