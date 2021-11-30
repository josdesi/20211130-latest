'use strict'

/*
|--------------------------------------------------------------------------
| SendgridConfigurationSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')
const SendgridConfiguration = use('App/Models/SendgridConfiguration');

class SendgridConfigurationSeeder {
  async run (externalTransaction, configs = []) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    try {
      for(const key of Object.keys(configs)) {
        const { template_id, sender, type, sender_name } = configs[key];
        const currentConfig = await SendgridConfiguration.findBy('template_id',template_id);
        if (currentConfig) {
          currentConfig.merge({
            sender,
            type,
            sender_name
          });
          await currentConfig.save();
          continue;
        }
        await SendgridConfiguration.create({
          template_id, 
          sender, 
          type, 
          sender_name
        }, transaction);
      }
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
    }
  }
}

module.exports = SendgridConfigurationSeeder
