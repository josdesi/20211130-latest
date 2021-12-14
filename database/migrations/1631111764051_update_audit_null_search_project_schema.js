'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UpdateAuditNullSearchProjectSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const updateRows = `
       UPDATE search_projects SET updated_by = created_by WHERE updated_by is NULL
      `;
      try {
        await transaction.raw(updateRows);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
  }
}

module.exports = UpdateAuditNullSearchProjectSchema
