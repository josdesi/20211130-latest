'use strict';

const appInsights = require("applicationinsights");
const BlueSheet = use('App/Models/BlueSheet');
const Database = use('Database');
const BlueSheetHasRelocation = use('App/Models/BlueSheetHasRelocation');
const Candidate = use('App/Models/Candidate');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const { CandidateStatusSchemes } = use('App/Helpers/Globals');

class BlueSheetRepository {
  async create(req, candidate_id, trx) {
    try {
      const {
        reason_leaving,
        relocations,
        achievement_one,
        achievement_two,
        achievement_three,
        experience,
        time_looking,
        time_to_start,
        minimum_salary,
        good_salary,
        no_brainer_salary,
        interview_dates,
        notes,
        time_start_type_id,
        candidate_type_id,
        work_type_option_id
      } = req;

      const rel = relocations ? 1 : 0;

      const blue_sheet = await BlueSheet.create(
        {
          candidate_id,
          reason_leaving,
          relocation: rel,
          achievement_one,
          achievement_two,
          achievement_three,
          experience,
          time_looking,
          time_to_start,
          minimum_salary,
          good_salary,
          no_brainer_salary,
          interview_dates,
          notes,
          time_start_type_id,
          candidate_type_id,
          work_type_option_id
        },
        trx
      );

      //Store BlueSheetHasRelocation if exist
      if (relocations) {
        for (const city_id of relocations) {
          await BlueSheetHasRelocation.create(
            {
              blue_sheet_id:blue_sheet.id,
              city_id
            },
            trx
          );
        }
      }
      return { success: true, code: 200, message: 'BlueSheet Created Succesfully', data:blue_sheet };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the bluesheet, please try again later' 
      };
    }
  }

  async update(req , candidate_id, blueSheetId,user_id) {
    const blueSheet = await BlueSheet.query()
      .where('id',blueSheetId)
      .where('candidate_id' , candidate_id)
      .first()
    if(!blueSheet){
      return {
        success: false,
        code: 404,
        message:'BlueSheet not found' 
      };
    }
    const candidate  = await Candidate.find(candidate_id)
    // transaction
    const trx = await Database.beginTransaction();

    try {
      const previousCandidateTypeId = blueSheet.candidate_type_id;
      const {
        reason_leaving,
        relocations,
        achievement_one,
        achievement_two,
        achievement_three,
        experience,
        time_looking,
        time_to_start,
        minimum_salary,
        good_salary,
        no_brainer_salary,
        interview_dates,
        notes,
        time_start_type_id,
        candidate_type_id,
        work_type_option_id,
        status_id
      } = req;

      const rel = relocations ? 1 : 0;

      await blueSheet.merge(
        {
          reason_leaving,
          relocation: rel,
          achievement_one,
          achievement_two,
          achievement_three,
          experience,
          time_looking,
          time_to_start,
          minimum_salary,
          good_salary,
          no_brainer_salary,
          interview_dates,
          notes,
          time_start_type_id,
          candidate_type_id,
          work_type_option_id
        },
        trx
      );
      await blueSheet.save(trx)


      //Store BlueSheetHasRelocation if exist
      await BlueSheetHasRelocation.query()
        .where('blue_sheet_id', blueSheetId)
        .delete(trx);
      if (relocations) {
        for (const city_id of relocations) {
          await BlueSheetHasRelocation.create(
            {
              blue_sheet_id:blueSheetId,
              city_id
            },
            trx
          );
        }
      }

      await candidate.merge({ updated_by: user_id, status_id: status_id || CandidateStatusSchemes.Ongoing });
      await candidate.save(trx);

      await trx.commit();

      const bluesheetDetails = await this.details(blueSheetId)
      bluesheetDetails.status_id = status_id;

      Event.fire(EventTypes.Candidate.BlueSheetUpdated, {
        candidate,
        blueSheet: bluesheetDetails,
        userId: user_id,
        previousCandidateTypeId,
        candidateId:candidate.id
      });

      return { success: true, code: 201, data: bluesheetDetails };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});
      
      trx.rollback();

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the bluesheet, please try again later' 
      };
    }
  }

  async details(id){
    const query = BlueSheet.query();
    query
      .where({ id })
      .setHidden(['created_at', 'updated_at'])
      .with('relocations', builder => {
        builder.setHidden(['city_id', 'blue_sheet_id', 'created_at', 'updated_at']);
        builder.with('city', builder => {
          builder.setHidden(['created_at', 'updated_at', 'state_id']);
          builder.with('state', builder => {
            builder.setHidden(['created_at', 'updated_at', 'country_id']);
          });
        });
      })
      .with('candidateType',builder=>{
        builder.select(['title','id', 'style_class_name'])
      })
      .with('workTypeOption', builder => {
        builder.select(['id', 'title'])
      })
      .with('timeToStart',builder=>{
        builder.select(['title','id'])
      });
    
    const blueSheet = await query.fetch();

    return blueSheet.rows[0];
      
  }

  /**
   * Returns a BlueSheet Object
   * 
   * @method getByCandidate
   * 
   * @param {Integer} candidateId
   * 
   * @return {Object} A Bluesheet object 
  */
  async getByCandidate(candidateId){
    return await BlueSheet.findBy('candidate_id',candidateId);
  }

  /**
   * Updates the status/type for a Blue Sheet
   * 
   * @method updateStatusByCandidate
   * 
   * @param {Integer} candidateId
   * @param {Integer} candidateTypeId
   * @param {Integer} userId
  */
  async updateStatusByCandidate(candidateId, candidateTypeId ,userId ,shouldEvaluateFreeGame){
    let trx;
    try {
      const blueSheet = await BlueSheet.query()
        .where('candidate_id' , candidateId)
        .first()
      if(!blueSheet){
        return {
          success: false,
          code: 404,
          message:'BlueSheet not found' 
        };
      }
      const previousCandidateTypeId = blueSheet.candidate_type_id;
      const candidate  = await Candidate.find(candidateId);

      trx = await Database.beginTransaction();

      await blueSheet.merge({candidate_type_id: candidateTypeId});
      await blueSheet.save(trx)
      await candidate.merge({ updated_by: userId });
      await candidate.save(trx);

      await trx.commit();

      Event.fire(EventTypes.Candidate.BlueSheetUpdated, {
        candidate,
        blueSheet,
        userId,
        previousCandidateTypeId,
        candidateId,
        shouldEvaluateFreeGame
      });
    } catch (error) {
      trx && trx.rollback();
      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the bluesheet, please try again later' 
      };
    }

  }
}

module.exports = BlueSheetRepository;
