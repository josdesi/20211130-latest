'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class HiringAuthorityLastActivityLogsSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const populateTable = `
      INSERT INTO hiring_authority_last_activity_logs (hiring_authority_id, user_id, hiring_authority_activity_log_id, activity_log_type_id, body, created_at, updated_at, created_by_system, metadata, title, user_name)
      SELECT DISTINCT on (hiring_authority_id) 
        act.hiring_authority_id,
        act.user_id,
        act.id as hiring_authority_activity_log_id,
        act.activity_log_type_id,
        act.body,
        act.created_at,
        act.updated_at,
        act.created_by_system,
        act.metadata,
        act_types.title,
        pi.full_name as user_name
      from hiring_authority_activity_logs as act 
      inner join activity_log_types as act_types on act.activity_log_type_id = act_types.id
      inner join users on act.user_id = users.id 
      inner join personal_informations as pi on users.personal_information_id = pi.id
      order by hiring_authority_id desc, created_at desc;`;
      await Database.raw(populateTable).transacting(transaction);
    });
  }
}

module.exports = HiringAuthorityLastActivityLogsSchema;
