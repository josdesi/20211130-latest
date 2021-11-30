'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

const { SendoutTypesSchemes } = use('App/Helpers/Globals');

const data = [
  { id: SendoutTypesSchemes.Sendout, style: '#015AC0' },
  { id: SendoutTypesSchemes.Sendover, style: '#F39C12' },
];

class SendoutTypeSchema extends Schema {
  up () {
    this.table('sendout_types', (table) => {
      // alter table
      table.string('style', 45);
    })

    this.schedule(async (transaction) => {
      try {
        for(const item of data){
          await transaction.table('sendout_types').where('id', item.id).update({ style : item.style });
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('sendout_types', (table) => {
      // reverse alternations
      table.dropColumn('style');
    })
  }
}

module.exports = SendoutTypeSchema
