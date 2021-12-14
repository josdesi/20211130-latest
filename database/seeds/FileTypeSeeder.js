'use strict'

/*
|--------------------------------------------------------------------------
| TypeFileSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const FileType = use('App/Models/FileType');
const { types } = use('App/Helpers/FileType');

  class TypeFileSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    try {
      for(const key of Object.keys(types)) {
        const { _id, _module, _title, _required, _order, _multiple } = types[key];
        const currentType = await FileType.find(_id);
        if (currentType) {
          currentType.merge({
            module: _module,
            title: _title, 
            required: _required, 
            order: _order,
            multiple: _multiple
          });
          await currentType.save();
          continue;
        }
        await FileType.create({
          id: _id,
          module: _module,
          title: _title, 
          required: _required, 
          order: _order,
          multiple: _multiple
        }, transaction);
      }
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
    }
  }
}

module.exports = TypeFileSeeder
