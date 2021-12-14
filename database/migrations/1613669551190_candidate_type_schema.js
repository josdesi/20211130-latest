'use strict'

// const { StatusColorsSchemes } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

// Models
// const CandidateType = use('App/Models/CandidateType');

class CandidateTypeSchema extends Schema {
  up () {
    this.table('candidate_types', (table) => {
      // alter table
      table.specificType('available', 'smallint').defaultTo(1);
    })

    this.schedule(async (trx) => {
      const query = `
        UPDATE candidate_types
          SET available = 0
        WHERE candidate_types.id IN (3, 4)
      `;

      try {
        await Database.raw(query).transacting(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    })
    // this.schedule(async (trx) => {
    //   const candidateTypes = [
    //     {id: 0, title: 'Alpha', style_class_name: StatusColorsSchemes.Alpha },
    //     {id: 1, title: 'POEJO', style_class_name: StatusColorsSchemes.Poejo },
    //     {id: 2, title: `Can't help`, style_class_name: StatusColorsSchemes.CantHelp }
    //   ];

    //   const candidateTypeLogs = `
    //     UPDATE candidate_type_logs
    //       SET candidate_type_id = 0
    //     WHERE candidate_type_id > 2
    //   `;

    //   try {
    //     // await Database.raw(candidateTypeLogs).transacting(trx);

    //     for (const type of candidateTypes) {
    //       if (await CandidateType.find(type.id)) {
    //         await CandidateType.query().where('id', type.id).update(type, trx);
    //         continue;
    //       }
    //     }
    //     await CandidateType.query().where('id', '>=', 3).transacting(trx).delete();
    //   } catch (error) {
    //     await trx.rollback();
    //     throw error;
    //   }
    // })
  }

  down () {
    this.table('candidate_types', (table) => {
      // reverse alternations
      table.dropColumn('available');
    })
  }
}

module.exports = CandidateTypeSchema
