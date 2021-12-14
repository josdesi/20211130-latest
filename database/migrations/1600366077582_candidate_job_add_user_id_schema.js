'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const {MongoClient} = require('mongodb');
const Env = use('Env');
const Candidate = use('App/Models/Candidate');
const JobOrder = use('App/Models/JobOrder');
const { EntityTypes } = use('App/Helpers/Globals');

class CandidateJobAddUserIdSchema extends Schema {
  up () {
    this.schedule(async () => {
      const client = await MongoClient.connect(Env.get('DB_AGENDA_CONNECTION'));
      const _collection = await client.db(Env.get('DB_AGENDA_DATABASE')).collection(Env.get('DB_AGENDA_COLLECTION'));
      const result = await _collection.find({ data: { $ne: null } } ).toArray();
      const session = await client.startSession();
      session.startTransaction();
      try {
        const opts = { session, returnOriginal: false };
        for(const value of result){
          let recruiterId = null;
          switch (value.data.entityType) {
            case EntityTypes.Candidate:
              const ca = await Candidate.find(value.data.id);
              recruiterId = ca ? ca.recruiter_id : null;
              break;
          
            case EntityTypes.JobOrder:
              const jo = await JobOrder.find(value.data.id);
              recruiterId = jo ? jo.recruiter_id : null;
              break;
          }
          const updated = await _collection.updateOne(
            { _id :  value._id },
            { $set: { "data.userId" : recruiterId } },
            opts
          );
        }
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      }finally{
        await session.endSession();
        await client.close();
      }
    });
  }

  down(){

  }

}

module.exports = CandidateJobAddUserIdSchema
