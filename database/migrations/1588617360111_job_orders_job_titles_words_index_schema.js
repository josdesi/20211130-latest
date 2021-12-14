'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrdersJobTitlesWordsIndexSchema extends Schema {
  up () {
    const createWordIndexTable = `
    CREATE  TABLE  IF NOT EXISTS job_orders_job_titles_words_indices AS 
      SELECT word FROM 
        ts_stat('select to_tsvector( ''simple'', title) from job_orders');
    `;

    this.raw(createWordIndexTable)
        //.raw(createGinIndex);
  }
  down () {
    this.drop('job_orders_job_titles_words_indices')
  }
}

module.exports = JobOrdersJobTitlesWordsIndexSchema
