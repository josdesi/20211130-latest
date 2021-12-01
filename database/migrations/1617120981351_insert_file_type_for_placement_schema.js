'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { types } = use('App/Helpers/FileType');
const FileType = use('App/Models/FileType');

class InsertFileTypeForPlacementSchema extends Schema {
  up () {
    const placementFileTypes = Object.keys(types).filter((key) => types[key]._module === 'placement');
    this.schedule(async () => {
      for (const val of placementFileTypes) {
        const { _id , _title, _module } = types[val];
        await FileType.findOrCreate({ id: _id }, {
          id: _id,
          title: _title,
          module: _module
        });
      }
    });

  }

  down () {
    this.schedule(async () => {
      await FileType.query().where('module', 'placement').delete();
    });
  }
}

module.exports = InsertFileTypeForPlacementSchema
