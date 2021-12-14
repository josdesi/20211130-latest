'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CommonPositionsSchema extends Schema {
  up() {
    this.create('common_positions', (table) => {
      table.increments()
      table.text('title').notNullable().unique();
    });

    // copy data
    this.schedule(async (trx) => {
      await trx.table('common_positions')
        .insert([
          { title: 'Owner' },
          { title: 'CEO' },
          { title: 'COO' },
          { title: 'CIO' },
          { title: 'CFO' },
          { title: 'CTO' },
          { title: 'President' },
          { title: 'VP' },
          { title: 'Principal' },
          { title: 'Partner' },
          { title: 'Purchasing' },
          { title: 'Director' },
          { title: 'HR' },
          { title: 'Manager' },
          { title: 'Marketing' },
          { title: 'IT' },
          { title: 'Admin' },
          { title: 'Advisor' },
          { title: 'Associate' },
          { title: 'Quality' },
          { title: 'Finance' },
          { title: 'Service Technician' },
          { title: 'Senior Manager' },
          { title: 'Supervisor' },
          { title: 'Sales' },
          { title: 'Safety' },
          { title: 'Supply Chain' },
          { title: 'Chief' },
          { title: 'Business Development' }
        ]);
    });
  }

  down() {
    this.drop('common_positions');
  }
}

module.exports = CommonPositionsSchema;
