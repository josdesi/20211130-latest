'use strict';

const appInsights = require("applicationinsights");
const WhiteSheet = use('App/Models/WhiteSheet');
const userRepository = new (use('App/Helpers/UserRepository'))();
const { 
  userRoles,
  userPermissions,
  companyType,
  JobOrderStatusSchemes
} = use('App/Helpers/Globals');
const JobOrder = use('App/Models/JobOrder');
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const Database = use('Database');

class WhiteSheetRepository {
  async create(req, job_order_id, user_id, trx) {
    try {
      const {
        job_order_type_id,
        discussing_agreement_complete,
        fee_agreement_percent,
        time_position_open,
        position_filled,
        minimum_compensation,
        good_compensation,
        maximum_compensation,
        benefits,
        background_requirements,
        preset_interview_dates,
        notes,
        warranty_time_in_days,
        work_type_option_id,
        company_fee_agreement_id,
        company_prepared_to_sign_service_agreement,
        company_prepared_to_interview_asap
      } = req;
      if (!company_fee_agreement_id && (!warranty_time_in_days || !fee_agreement_percent)) {
        return {
          success: false,
          code: 400,
          message: 'Guarantee days and Fee percent are mandatory when fee agreement is not provided' 
        };
      }
      const  creationData = {
        job_order_id,
        job_order_type_id,
        discussing_agreement_complete,
        fee_agreement_percent,
        time_position_open,
        position_filled,
        minimum_compensation,
        good_compensation,
        maximum_compensation,
        benefits,
        background_requirements,
        preset_interview_dates,
        notes,
        work_type_option_id,
        company_fee_agreement_id,
        warranty_time_in_days,
        company_prepared_to_sign_service_agreement,
        company_prepared_to_interview_asap
      };
      const isAdmin = await userRepository.hasRole(user_id, userRoles.Admin);
      const isCoach = await userRepository.hasRole(user_id, userRoles.Coach);
      const hasFeeGuaranteePermission = await userRepository.hasPermission(user_id, userPermissions.feeAgreements.modifyGuarantee);
      if ( isAdmin || isCoach || hasFeeGuaranteePermission) {
        creationData.warranty_time_in_days = warranty_time_in_days;
        creationData.fee_agreement_percent = fee_agreement_percent;
      }
      const whiteSheet = await WhiteSheet.create(
        creationData,
        trx
      );

      return { success: true, code: 200, message: 'Write Up Created Successfully',data: whiteSheet };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the Write Up' 
      };
    }
  }

  async update(req , job_order_id, whiteSheetId, user_id) {
    const whiteSheet = await WhiteSheet.query()
      .where('id',whiteSheetId)
      .where('job_order_id' , job_order_id)
      .first()
    if(!whiteSheet){
      return {
        success: false,
        code: 404,
        message:'Write Up not found' 
      };
    }
    const jobOrder = await JobOrder.find(job_order_id);

    try {
      const previousJobOrderTypeId = whiteSheet.job_order_type_id;
      const {
        job_order_type_id,
        discussing_agreement_complete,
        fee_agreement_percent,
        time_position_open,
        position_filled,
        minimum_compensation,
        good_compensation,
        maximum_compensation,
        benefits,
        background_requirements,
        preset_interview_dates,
        notes,
        warranty_time_in_days,
        work_type_option_id,
        company_fee_agreement_id,
        company_prepared_to_sign_service_agreement,
        company_prepared_to_interview_asap,
        status_id
      } = req;
      if (!company_fee_agreement_id && (!warranty_time_in_days || !fee_agreement_percent)) {
        return {
          success: false,
          code: 400,
          message: 'Guarantee days and Fee percent are mandatory when fee agreement is not provided' 
        };
      }
      const updateData = {
        job_order_type_id,
        discussing_agreement_complete,
        fee_agreement_percent,
        time_position_open,
        position_filled,
        minimum_compensation,
        good_compensation,
        maximum_compensation,
        benefits,
        background_requirements,
        preset_interview_dates,
        notes,
        work_type_option_id,
        warranty_time_in_days,
        company_fee_agreement_id,
        company_prepared_to_sign_service_agreement,
        company_prepared_to_interview_asap
      };
      const isAdmin = await userRepository.hasRole(user_id, userRoles.Admin);
      const isCoach = await userRepository.hasRole(user_id, userRoles.Coach);
      const hasFeeGuaranteePermission = await userRepository.hasPermission(user_id, userPermissions.feeAgreements.modifyGuarantee);
      const usersOnDig = await RecruiterRepository.recruiterOnTeam(user_id);
      if ( isAdmin || ( (isCoach || hasFeeGuaranteePermission) && (usersOnDig.includes(jobOrder.created_by) || usersOnDig.includes(jobOrder.recruiter_id) ))) {
        updateData.warranty_time_in_days = warranty_time_in_days;
        updateData.fee_agreement_percent = fee_agreement_percent;
      }

      await whiteSheet.merge(updateData);
      await jobOrder.merge({ updated_by:user_id, status_id: status_id || JobOrderStatusSchemes.Ongoing });

      if (status_id === JobOrderStatusSchemes.Placed) {
        await Database.table('companies')
        .update('company_type_id', companyType.Client)
        .whereRaw('id in (select company_id from job_orders where id = ?)', jobOrder.id);
      }

      await whiteSheet.save()
      await jobOrder.save();

      const whiteSheetDetails = await this.details(whiteSheetId)
      whiteSheetDetails.status_id = status_id;

      Event.fire(EventTypes.JobOrder.WhiteSheetUpdated, {
        jobOrder,
        whiteSheet: whiteSheetDetails,
        userId: user_id,
        previousJobOrderTypeId,
        jobOrderId:jobOrder.id
      });

      return { success: true, code: 201, data: whiteSheetDetails };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the Write Up, please try again later' 
      };
    }
  }

  async details(id){
    const query = WhiteSheet.query();
    query
      
      .where({ id })
      .setHidden(['created_at', 'updated_at'])
      .with('workTypeOption', builder => {
        builder.select(['id', 'title'])
      })
      .with('companyFeeAgreement', (builder) => {
        builder.select(['id', 'fee_percentage', 'guarantee_days', 'flat_fee_amount', 'fee_agreement_payment_scheme_id'])
      })
      .with('jobOrderType',builder=>{
        builder.select(['title','id', 'style_class_name'])
      });
    
    const blueSheet = await query.fetch();

    return blueSheet.rows[0];
      
  }

  
  /**
   * Returns a WhiteSheet  Object
   * 
   * @method getByJobOrder
   * 
   * @param {Integer} jobOrderId
   * 
   * @return {Object} A WhiteSheet object 
  */
  async getByJobOrder(jobOrderId){
    return await WhiteSheet.findBy('job_order_id',jobOrderId);
  }


    /**
   * Updates the status/type for a white Sheet
   * 
   * @method updateStatusByCandidate
   * 
   * @param {Integer} jobOrderId
   * @param {Integer} jobOrderTypeId
   * @param {Integer} userId
  */
 async updateStatusByJobOrder(jobOrderId, jobOrderTypeId ,userId ,shouldEvaluateFreeGame){
  let trx;
  try {
    const whiteSheet = await WhiteSheet.query()
      .where('job_order_id' , jobOrderId)
      .first()
    if(!whiteSheet){
      return {
        success: false,
        code: 404,
        message:'Write Up not found' 
      };
    }
    const previousJobOrderTypeId = whiteSheet.job_order_type_id;
    const jobOrder  = await JobOrder.find(jobOrderId);

    trx = await Database.beginTransaction();

    await whiteSheet.merge({job_order_type_id: jobOrderTypeId});
    await whiteSheet.save(trx)
    await jobOrder.merge({ updated_by: userId });
    await jobOrder.save(trx);

    await trx.commit();

    Event.fire(EventTypes.JobOrder.WhiteSheetUpdated, {
      jobOrder,
      whiteSheet,
      userId,
      previousJobOrderTypeId,
      jobOrderId,
      shouldEvaluateFreeGame
    });
  } catch (error) {
    trx && trx.rollback();
    return {
      success: false,
      code: 500,
      message: 'There was a problem updating the Write Up, please try again later' 
    };
  }

}
}

module.exports = WhiteSheetRepository;
