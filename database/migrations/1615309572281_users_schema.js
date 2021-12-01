'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UsersSchema extends Schema {
  up () {
    this.raw(`
      CREATE UNIQUE INDEX v_users_unique_idx
        ON v_users USING btree
        (id ASC NULLS LAST);
    `);

    this.raw(`
      CREATE 
      OR REPLACE FUNCTION fp_refresh_v_users() RETURNS void SECURITY DEFINER
      AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY v_users;
      RETURN;
      END;
      $$ 
      LANGUAGE plpgsql
    `);
  }

  down () {
    this.table('users', (table) => {
      // reverse alternations
    })
  }
}

module.exports = UsersSchema
