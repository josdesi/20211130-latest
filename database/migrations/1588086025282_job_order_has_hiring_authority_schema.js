'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')
class JobOrderHasHiringAuthoritySchema extends Schema {
  up () {
    this.create('job_order_has_hiring_authorities', (table) => {
      table.increments()
      table
        .integer('job_order_id')
        .unsigned()
        .references('id')
        .inTable('job_orders')
      table
        .integer('hiring_authority_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authorities')
      table.timestamps()

      //Add unique constraint for combination (job_order, hiring_authority_id)
      const addUnique = `
        ALTER TABLE job_order_has_hiring_authorities
        ADD CONSTRAINT unique_job_order_hiring_authority
        UNIQUE (job_order_id, hiring_authority_id)
      `
      this.raw(addUnique)

      this.schedule(async (transaction) => {
        const migrateRelationToNewTable = `
        INSERT INTO job_order_has_hiring_authorities (job_order_id, hiring_authority_id)
        SELECT  id, hiring_authority_id FROM  job_orders
      `
        await Database.raw(migrateRelationToNewTable).transacting(transaction)
      })

    })
  }

  down () {
    this.drop('job_order_has_hiring_authorities')
  }
}

module.exports = JobOrderHasHiringAuthoritySchema
