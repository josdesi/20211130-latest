'use strict';

//Utils
const Database = use('Database');
const appInsights = require('applicationinsights');
const { fileType, types } = use('App/Helpers/FileType');
const { moveFile, copyFile, deleteServerFile } = use('App/Helpers/FileHelper');
const {
  EntityTypes,
  userFields,
  FeeAgreementPaymentSchemes,
  OperationType,
  userRoles,
  CandidateStatusSchemes,
  JobOrderStatusSchemes,
  CandidateTypeSchemes,
  JobOrderTypeSchemes,
  userPermissions
} = use('App/Helpers/Globals');
const { 
  placementStatus,
  profileDefaultRelations,
  summaryColumns
} = use('App/Utils/PlacementUtils');
const EventTypes = use('App/Helpers/Events');
const Event = use('Event');
const entityFileTables = {
  [EntityTypes.Candidate]: 'candidate_has_files',
  [EntityTypes.JobOrder]: 'job_order_has_files',
  [EntityTypes.Company]: 'company_has_files'
};
const { find, sumBy, filter, findKey, countBy, get, cloneDeep, isEmpty, remove, compact } = use('lodash');
const Antl = use('Antl');
const modulePlacementFiles = filter(types, { _module: 'placement' });
const requiredFiles = filter(modulePlacementFiles, { _required: true });
const moment = use('moment');
const { detailedDiff } = use("deep-object-diff");
const InstantMessagingService = new (use('App/Services/InstantMessagingService'))();

//Models
const Placement = use('App/Models/Placement');
const PlacementHasFile = use('App/Models/PlacementHasFile');
const PlacementSplit = use('App/Models/PlacementSplit');
const PlacementSuggestedUpdate = use('App/Models/PlacementSuggestedUpdate');
const PlacementInvoice = use('App/Models/PlacementInvoice');
const PlacementPayment = use('App/Models/PlacementPayment');
const User = use('App/Models/User');
const PlacementLog = use('App/Models/PlacementLog');
const PlacementStatus = use('App/Models/PlacementStatus');
const PlacementFallOffReason = use('App/Models/PlacementFallOffReason');
const Sendout = use('App/Models/Sendout');
const Company = use('App/Models/Company');

//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();
const PlacementListBuilder = use('App/Helpers/PlacementListBuilder');

class PlacementRepository {
  constructor() {
    this.defaultRelations = profileDefaultRelations
    this.summaryColumns = summaryColumns;
  }

  /**
   * Returns the paginated data of placements
   *
   * @param {Object} request
   * @param {Integer} userId
   * @param {Integer} timezone
   *
   * @return {Object} The placements data
   */
  async listing(queryParams, userId, timezone) {
    try {
      const { page = 1, perPage = 10, orderBy, direction, keyword, ...rest } = queryParams;
      const columnsToSelect = [
        'plt.id',
        'plt.start_date',
        'plt.last_invoice_date as invoice_date',
        'plt.approved_date',
        'plt.fall_off_date',
        'plt.fee_amount',
        'plt.created_at',
        'plts.title as status_title',
        'plts.style as status_color',
        'plts.id as status_id',
        'user_info.coach_name as coach',
        'user_info.regional_full_name as regional',
        'spec.industry as industry',
        'spec.title as specialty',
        'sub.title as subspecialty',
        Database.raw(`json_build_object('id', ca.id, 'full_name', pic.full_name) as candidate`),
        Database.raw(`json_build_object('id', cp.id, 'name', cp.name) as company`)
      ];
      const builder = new PlacementListBuilder();
      builder.buildBaseListQuery(columnsToSelect);
      builder.applyKeywordClause(keyword);
      await builder.applyWhereClause(rest, userId, timezone);
      builder.applyOrderClause(direction, orderBy);
      const placements = await builder.query.paginate(page, perPage);

      const ids = placements.data.map((val) => val.id);
      const splits = await Database.table('placement_splits as ps')
        .select([
          'ps.is_channel_partner',
          'ps.user_id',
          'ps.type',
          'usr.initials',
          'ps.placement_id'
        ])
        .innerJoin('users as usr','ps.user_id','usr.id')
        .whereIn('ps.placement_id',ids);

      return {
        success: true,
        code: 200,
        data: await this.withCustomFormatting(placements, splits),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'placements data',
        }),
      };
    }
  }


  async withCustomFormatting(paginatedPlacements, splits) {
    if (paginatedPlacements.data) {
      const placementsList = paginatedPlacements.data;
      const splitsUserParams = {
        pathToUserValue: 'initials', 
        pathToUserId: 'user_id',
        evaluateOfficeCase: false
      }
      return {
        ...paginatedPlacements,
        data: await Promise.all(
          placementsList.map(async (placement) => {
            const placementSplits = filter(splits, { placement_id : placement.id });
            const candidateUsers = await this.formatItemSplitUser(placementSplits, { type: 'candidate', ...splitsUserParams });
            const companyUsers = await this.formatItemSplitUser(placementSplits, { type: 'company', ...splitsUserParams });
            return {
              ...placement,
              status: {
                id: placement.status_id,
                title: placement.status_title,
                color: placement.status_color,
              },
              recruiters: `${companyUsers}${(companyUsers.length > 0 && candidateUsers.length > 0) ? '/' : ''}${candidateUsers}`
            }
          })
        ),
      };
    }
    return paginatedPlacements;
  }

  /**
   * Returns a custom response that determines
   * the creation of a placement
   *
   * @method create
   *
   * @param {Integer} sendoutId
   * @param {Object} feeData
   * @param {Array} splits
   * @param {Array} files
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async create(sendoutId, feeData, placementData, userId) {
    let trx, placement_status_id = placementStatus.Pending_Coach_Validation._id, eventPayload = {}, responseData = {};
    try {
      const { splits = [], files = [], notes, source_type_id, job_order_source_type_id, payment_details, additional_invoice_recipients = [] } = placementData;
      //Validation
      const validationSplitRepeated = this.validateNotRepeatedSplitUsers(splits);
      if (!validationSplitRepeated.success) {
        responseData = validationSplitRepeated;
        return;
      }
      const validationFiles = await this.validateFilesRequired(files, sendoutId);
      if (!validationFiles.success) {
        responseData = validationFiles;
        return;
      }
      const validationSplit = this.validateSplitTotal(splits);
      if (!validationSplit.success) {
        responseData = validationSplit;
        return;
      }
      const {       
        fee_agreement_payment_scheme_id,
        fee_percentage,
        service_months,
        first_year_value,
        start_date,
        guarantee_days,
        company_fee_agreement_id,
        monthly_amount
      } = feeData;

      const fee_amount = this.calculateFeeAmount(
        fee_agreement_payment_scheme_id,
        first_year_value,
        fee_percentage,
        feeData.fee_amount
      );
      trx = await Database.beginTransaction();
      const dataToCreate = {
        fee_agreement_payment_scheme_id,
        fee_amount,
        fee_percentage,
        service_months,
        first_year_value,
        monthly_amount,
        start_date,
        sendout_id: sendoutId,
        placement_status_id,
        notes,
        guarantee_days,
        company_fee_agreement_id,
        payment_details,
        additional_invoice_recipients,
        created_by: userId,
        updated_by: userId,
      }
      const { assignedRoles = [] } =  await UserRepository.hasRoles(userId, [userRoles.Coach, userRoles.RegionalDirector, userRoles.Operations, userRoles.ProductionDirector]);
      const hasOverrideApproval = await  UserRepository.hasPermission(userId, userPermissions.placements.overrideApproval);
      if (assignedRoles.includes(userRoles.RegionalDirector) || assignedRoles.includes(userRoles.Operations) || assignedRoles.includes(userRoles.ProductionDirector) || hasOverrideApproval) {
        dataToCreate.placement_status_id = placementStatus.Pending_To_Invoiced._id;
        dataToCreate.approved_date = moment();
      }else if(assignedRoles.includes(userRoles.Coach)){
        dataToCreate.placement_status_id = placementStatus.Pending_Regional_Validation._id;
      }
      //Store Placement
      const placement = await Placement.create(dataToCreate,trx);

      //Store Placement Splits
      for (const split of splits) {
        await PlacementSplit.create(
          {
            placement_id: placement.id,
            user_id: split.user_id,
            split_percentage: split.percent,
            is_channel_partner: split.is_channel_partner,
            type: split.type,
            created_by: userId,
            updated_by: userId,
          },
          trx
        );
      }

      //Store PlacementFiles
      const attachmentFileType = await fileType('ATTACHMENT');
      for (const file of files) {
        const { fileName, fileUrl, skip = false, success = true, code, message } = await this.getDataForFile(file, userId, trx);
        if(!success){
          trx && (await trx.rollback());
          responseData = {
            success,
            message,
            code
          };
          return;
        }
        if (skip) continue;
        const _fileType = find(types, { _id: file.type_id }) || attachmentFileType;
        await PlacementHasFile.create(
          {
            placement_id: placement.id,
            file_type_id: _fileType._id,
            url: fileUrl,
            file_name: fileName,
            entity: file.entity,
          },
          trx
        );
      }

      await this.updateCandidateSourceType(sendoutId, source_type_id, trx);
      await this.updateJobSourceType(sendoutId, job_order_source_type_id, trx);

      await trx.commit();

      eventPayload = {
        placement,
        placementId: placement.id,
        entity: EntityTypes.Placement.default,
        payload: placement,
        operation: OperationType.Create,
        userId
      };

      const placementResult = await this.getPreviews({
        placement_id: placement.id,
      });

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.creation', { entity: 'Placement' }),
        code: 201,
        data: placementResult ? placementResult[0] : {},
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.default,
        payload: { exception: error.toString() },
        operation: OperationType.Create,
        successful_operation: false,
        userId
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'creating', entity: 'placement' }),
      };
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.Created, eventPayload);
      return responseData;
    }
  }

  async validateFilesRequired(files, sendoutId) {
    for (const type of requiredFiles) {
      if (!find(files, { type_id: type._id })) {
        return {
          success: false,
          message: Antl.formatMessage('messages.validation.required', { field: type._title }),
          code: 400,
        };
      }
    }
    if(!find(files, { type_id: types.REFERENCE_RELEASE_EMAIL._id }) && !await this.candidateHaveReferenceRelease(sendoutId)){
      return {
        success: false,
        message: Antl.formatMessage('messages.validation.required', { field: types.REFERENCE_RELEASE_EMAIL._title }),
        code: 400,
      };
    }
    return {
      success: true,
    };
  }

  async candidateHaveReferenceRelease(sendoutId){
    const sendout = await Sendout.find(sendoutId);
    const { candidate_id } = sendout;
    return await Database.table('reference_release_emails').where('candidate_id', candidate_id).first();
  }

  validateSplitTotal(splits = []) {
    const recruiters = splits.filter(val => val.is_channel_partner == 0);
    if (Number.parseInt(sumBy(recruiters, 'percent'), 10) !== 100) {
      return {
        success: false,
        message: Antl.formatMessage('messages.validation.splitPercent', { total: 100 }),
        code: 400,
      };
    }
    return {
      success: true,
    };
  }

  validateNotRepeatedSplitUsers(splits) {
    for (const split of splits) {
      const fnTotals = countBy(splits, { type: split.type, user_id: split.user_id, is_channel_partner: 0});
      if (fnTotals.true > 1) {
        return {
          success: false,
          message: Antl.formatMessage('messages.validation.splitRepeatedUser', { type: split.type }),
          code: 400,
        };
      }
    }
    return {
      success: true,
    };
  }

  async validateIfUserCanUpdate(userId, placementId, placementUserId){
    const response = {
      success: true
    };
    if(userId === placementUserId){
      return response;
    }
    const hasOverrideApproval = await  UserRepository.hasPermission(userId, userPermissions.placements.overrideApproval);
    if(hasOverrideApproval){
      return response;
    }
    const { coach_id, regional_director_id } =  await UserRepository.getCoachAndRegionalDirector(userId);
    if(userId === coach_id || userId === regional_director_id){
      return response;
    }
    const userSplit =  await PlacementSplit.query().where('placement_id',placementId).where('user_id',userId).where('is_channel_partner',false).first();
    if(userSplit){
      return response;
    }
    const { hasAtLeastOne } =  await UserRepository.hasRoles(userId, [userRoles.Finance, userRoles.ProductionDirector, userRoles.Operations]);
    if(hasAtLeastOne){
      return response;
    }
    return {
      success: false,
      code: 403,
      isInactive: false,
      redirect: false,
      message: Antl.formatMessage('messages.error.authorization')
    }
  }

  async details(id, relationsToInclude) {
    const placement = await Placement.query().include(relationsToInclude).where({ id }).first();
    if (!placement) {
      return;
    }
    const placementJSON = placement.toJSON();
    const { coach_id, regional_director_id } =  await UserRepository.getCoachAndRegionalDirector(placementJSON.created_by);
    placementJSON.coach = coach_id ? await User.find(coach_id) : null;
    placementJSON.regional = regional_director_id ? await User.find(regional_director_id) : null;
    return placementJSON;
  }

  async update(id, feeData, placementData, userId) {
    let trx, eventPayload = {}, responseData = {};
    try {
      const { splits = [], files = [], notes, isFinanceAdjusting = false, source_type_id, job_order_source_type_id, payment_details, additional_invoice_recipients = [] } = placementData;
      const validationSplitRepeated = this.validateNotRepeatedSplitUsers(splits);
      if (!validationSplitRepeated.success) {
        responseData = validationSplitRepeated;
        return;
      }
      const validationSplit = this.validateSplitTotal(splits);
      if (!validationSplit.success) {
        responseData = validationSplit;
        return;
      }
      const placement = await Placement.find(id);
      if (!placement) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Placement' }),
        };
        return;
      }
      const validationUserCanUpdate = await this.validateIfUserCanUpdate(userId, id, placement.created_by);
      if (!validationUserCanUpdate.success) {
        responseData = validationUserCanUpdate;
        return;
      }
      const originalPlacement = Object.assign({}, placement.toJSON());
      const hasFinanceRole = await UserRepository.hasRole(userId, userRoles.Finance);
      const placement_status_id = await this.getStatusWhenUpdates(placement, userId, isFinanceAdjusting);
      const placementFiles = await placement.files().fetch();

      const previousStatusId = placement.placement_status_id;
      const { fee_agreement_payment_scheme_id, fee_percentage, service_months, first_year_value, start_date, guarantee_days, fee_amount : feeAmount = null, monthly_amount } = feeData;
      const fee_amount = !hasFinanceRole ? 
        this.calculateFeeAmount(
          fee_agreement_payment_scheme_id,
          first_year_value,
          fee_percentage,
          feeAmount
        ) : feeAmount;
        
      const operation = this.getOperationTypeWhenUpdates(previousStatusId, placement_status_id, hasFinanceRole, isFinanceAdjusting);

      const dataToUpdate = {
        fee_agreement_payment_scheme_id,
        fee_percentage,
        service_months,
        first_year_value,
        start_date,
        fee_amount,
        monthly_amount,
        notes,
        guarantee_days,
        placement_status_id,
        previous_status_id: previousStatusId,
        updated_by: userId,
        payment_details,
        additional_invoice_recipients,
        is_dirty: placement_status_id === placementStatus.Pending_To_Invoiced._id
      }

      if(operation === OperationType.Placement.Approve){
        dataToUpdate.approved_date = moment();
      }

      trx = await Database.beginTransaction();
      if(trx != null){             
                    placement.merge(dataToUpdate);
                    await placement.save(trx);

                    //Store Placement Splits
                    await trx.table('placement_splits').where('placement_id', id).del();
                    for (const split of splits) {
                      await PlacementSplit.create(
                        {
                          placement_id: placement.id,
                          user_id: split.user_id,
                          split_percentage: split.percent,
                          is_channel_partner: split.is_channel_partner,
                          type: split.type,
                          created_by: userId,
                          updated_by: userId,
                        },
                        trx
                      );
                    }

                    //Store PlacementFiles
                    for (const file of files) {
                      const { type_id, action, entity, id } = file;
                      const fileType = find(modulePlacementFiles, { _id: type_id });
                      if (!fileType) continue;
                      const fieldsToSearch = fileType._multiple ? { id } : { file_type_id: type_id, placement_id: placement.id };
                      const fileExist = find(placementFiles.rows, fieldsToSearch);
                      const existOtherFileWithSameType = find(placementFiles.rows, (val) => val.file_type_id == type_id && val.id != id );
                      switch (action) {
                        case 'delete':
                          const haveNewFileToCreateWithSameType = find(files, (val) => val.type_id == type_id && !val.action );
                          if ((!fileType._required && type_id != types.REFERENCE_RELEASE_EMAIL._id) || haveNewFileToCreateWithSameType || existOtherFileWithSameType || 
                              (type_id == types.REFERENCE_RELEASE_EMAIL._id && await this.candidateHaveReferenceRelease(placement.sendout_id))) {
                            await trx.table('placement_has_files').where(fieldsToSearch).del();
                            if(fileExist){
                              await deleteServerFile(fileExist.url);
                              remove(placementFiles.rows,fieldsToSearch);
                            }
                          }
                          break;

                        default:
                          const { fileName, fileUrl, skip = false, success = true, message, code } = await this.getDataForFile(file, userId, trx);
                          if(!success){
                            await trx.rollback();
                            responseData = {
                              success,
                              message,
                              code
                            };
                            return;
                          }
                          if (skip) break;
                          if (!action && fileType._multiple || (!fileType._multiple && !existOtherFileWithSameType)) {
                            await PlacementHasFile.create(
                              {
                                placement_id: placement.id,
                                file_type_id: fileType._id,
                                url: fileUrl,
                                file_name: fileName,
                                entity: entity,
                              },
                              trx
                            );
                          } else if (action && action === 'replace' && !fileType._multiple) {
                            fileExist.merge({
                              url: fileUrl,
                              file_name: fileName,
                              entity: entity,
                            });
                            await fileExist.save(trx);
                          }
                        break;
                    }
                  }
      

        await this.updateCandidateSourceType(placement.sendout_id, source_type_id, trx);
        await this.updateJobSourceType(placement.sendout_id, job_order_source_type_id, trx);

        await trx.commit();
      }
      const changes = detailedDiff(originalPlacement, placement.toJSON());
      if(moment(originalPlacement.start_date).isSame(placement.start_date)){
        delete changes['start_date'];
      }

      await placement.loadMany(['files', 'splits']);

      eventPayload = {
        placement,
        changes,
        previousStatusId,
        placementId: placement.id,
        entity: EntityTypes.Placement.default,
        payload: changes,
        operation,
        userId
      };

      const placementResult = await this.getPreviews({
        placement_id: placement.id,
      });

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.update', { entity: 'Placement' }),
        code: 201,
        data: placementResult ? placementResult[0] : {}
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.default,
        payload: { exception: error.toString() },
        operation: OperationType.Update,
        userId,
        successful_operation: false
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'updating', entity: 'placement' }),
      };
    }finally {
      !isEmpty(eventPayload) &&  Event.fire(EventTypes.Placement.Updated, eventPayload);
      return responseData;
    }
  }

  calculateFeeAmount(fee_agreement_payment_scheme_id, first_year_value = 0, fee_percentage = 0, fee_amount = 0) {
    let feeAmount = Number(fee_amount);
    if(!Number.isFinite(feeAmount) || Number.isNaN(feeAmount)){
      return 0;
    }
    const defaultPercentageRegex = /^[3][3][.][3]+$/; //Special case
    if (fee_agreement_payment_scheme_id !== FeeAgreementPaymentSchemes.Flat) {
      if(defaultPercentageRegex.test(fee_percentage)){
        feeAmount = first_year_value / 3;
      }else {
        feeAmount = first_year_value * (fee_percentage / 100);
      }
    }
    return feeAmount.toFixed(2);
  }

  async getDataForFile(file, userId, trx) {
    let fileUrl, fileName;
    try {
      if (file.entity === EntityTypes.Placement.default) {
        const fileTemp = await Database.table('user_has_temp_files')
          .where('id', file.id)
          .where('user_id', userId)
          .first();
        if (!fileTemp) return { skip: true };
        fileUrl = await moveFile(fileTemp.file_name, 'placements/' + fileTemp.file_name);
        fileName = fileTemp.original_name;
        await trx.table('user_has_temp_files').where('id', file.id).where('user_id', userId).del();
      }else {
        let file_name, url;
        if(file.entity === EntityTypes.FeeAgreement){
          const feeFileResult = await Database.table('company_fee_agreements').where('id', file.id).first();
          if (!feeFileResult) return { skip: true };
          const { pdf_url } = feeFileResult;
          const urlSplit = pdf_url.split('/');
          file_name = urlSplit[urlSplit.length - 1];
          url = pdf_url;
        }else{
          const fileEntityResult = await Database.table(entityFileTables[file.entity]).where('id', file.id).first();
          if (!fileEntityResult) return { skip: true };
          file_name = fileEntityResult.file_name;
          url = fileEntityResult.url;
        }
        const name = file_name.slice(0, file_name.lastIndexOf('.'));
        const extension = file_name.slice(file_name.lastIndexOf('.'));
        const newFileName = `${name}-${new Date().getTime()}${extension}`;
        const fileCopyResult = await copyFile(url, 'placements', newFileName);
        if(!fileCopyResult.success){
          throw fileCopyResult.error;
        }
        fileUrl = fileCopyResult.url;
        fileName = file_name;
      }
      if (!fileUrl) {
        throw new Error('BlobWithoutURL');
      }
      return {
        fileName,
        fileUrl,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'processing', entity: 'files' }),
        code: 500
      };
    }
  }

  /**
   * Returns the summary totals of placements
   *
   * @param {Object} request
   * @param {Integer} userId
   * @param {Integer} timezone
   *
   * @return {Object} The summary placements
   */
  async summary(queryParams, userId, timezone) {
    try {
      const columnsToSelect = [
        Database.raw('count(plt.id) as total_status'),
        'plt.placement_status_id',
      ];
      const summaryData = {
        total: 0
      };
      const placementDefaultIds = Object.values(placementStatus)
        .map((val) => {
          return val._id;
        })
        .join(',');
      const { statusIds = placementDefaultIds, keyword, ...rest } = queryParams;

      const builder = new PlacementListBuilder();
      builder.buildBaseListQuery(columnsToSelect);
      builder.applyKeywordClause(keyword);
      await builder.applyWhereClause(rest, userId);
      builder.query.groupByRaw('plt.placement_status_id');
      const placements = await builder.query;
    
      this.calculateSummaryResult(statusIds, placements, summaryData);

      let summaryColumns = cloneDeep(this.summaryColumns);
      await this.formatSummaryResult(summaryColumns, summaryData);

      return {
        success: true,
        code: 200,
        data: summaryColumns,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'summary data' }),
      };
    }
  }

  calculateSummaryResult(statusIds, placements, summaryData) {
    for (const statusId of statusIds.split(',')) {
      const _statusId =  Number(statusId);
      const statusKey = findKey(placementStatus, { _id: _statusId });
      if (!statusKey) continue;
      const countObj = find(placements, { placement_status_id: _statusId });
      if (countObj) {
        summaryData[statusKey.toLowerCase()] = countObj.total_status;
      } else {
        summaryData[statusKey.toLowerCase()] = 0;
      }
      summaryData.total += summaryData[statusKey.toLowerCase()];
    }
  }

  async formatSummaryResult(summaryColumns, summaryData){
    const statuses = (await PlacementStatus.all()).toJSON();
    for(const column of summaryColumns){
      column.rows.forEach(row => {
        if(row.type === 'status'){
          const status = find(statuses , { id: placementStatus[row.key]._id });
          if(status){
            row.style.statusColor = status.style;
            row.label = status.title;
          }
        }
        row.key = row.key.toLowerCase();
        if(row.style.formatter === 'currency_bold'){
          row.value = this.formatNumber(summaryData[row.key])
        }else{
          row.value = summaryData[row.key]
        }
      });
    }
  }

  formatNumber(number){
    return (Math.round(number * 100) / 100).toFixed(2);
  }

  async getStatusWhenUpdates(placement = {}, userId, isFinanceAdjusting = false) {
    const { placement_status_id, id, created_by } = placement;
    const { coach_id, regional_director_id } =  await UserRepository.getCoachAndRegionalDirector(created_by);
    const hasOverrideApproval =await  UserRepository.hasPermission(userId, userPermissions.placements.overrideApproval);
    const { assignedRoles = [] } =  await UserRepository.hasRoles(userId, [userRoles.Finance, userRoles.ProductionDirector, userRoles.Operations]);

    if ([placementStatus.Pending_Regional_Validation._id, placementStatus.Pending_Coach_Validation._id, placementStatus.Pending_Update._id].includes(placement_status_id)){
      if(hasOverrideApproval || userId === regional_director_id){
        return placementStatus.Pending_To_Invoiced._id;
      }else if(assignedRoles.includes(userRoles.ProductionDirector) ||  assignedRoles.includes(userRoles.Operations) || (assignedRoles.includes(userRoles.Finance) && !isFinanceAdjusting) && placement_status_id !== placementStatus.Pending_Update._id){
        return placementStatus.Pending_To_Invoiced._id;
      }else if ([placementStatus.Pending_Coach_Validation._id, placementStatus.Pending_Update._id].includes(placement_status_id) && userId === coach_id) {
        return placementStatus.Pending_Regional_Validation._id;
      }
    }

    const [suggestedUpdate = {}] = (
      await PlacementSuggestedUpdate.query()
        .where('placement_id', id)
        .orderBy('created_at', 'desc')
        .limit(1)
        .fetch()
    ).toJSON();

    if(suggestedUpdate){
      const { user_id : requestUserId = null } = suggestedUpdate;
      if (placement_status_id === placementStatus.Pending_Update._id && (requestUserId === coach_id || requestUserId === regional_director_id)) {
        return requestUserId === regional_director_id ? placementStatus.Pending_Regional_Validation._id : placementStatus.Pending_Coach_Validation._id;
      }
    }
    return placement_status_id;
  }

  getOperationTypeWhenUpdates(previousStatusId, statusId, hasFinanceRole = false, isFinanceAdjusting = false){
    if (hasFinanceRole && isFinanceAdjusting) {
      return OperationType.Placement.MakeAdjustment;
    }
    return previousStatusId != statusId && (statusId === placementStatus.Pending_To_Invoiced._id || statusId === placementStatus.Pending_Regional_Validation._id)
      ? OperationType.Placement.Approve
      : OperationType.Update;
  };

  /**
   * Returns a custom response that determines
   * the creation of a suggestion update
   *
   * @method createASuggestion
   *
   * @param {Integer} placementId
   * @param {String} description
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async createASuggestion(placementId, description, userId) {
    let trx, eventPayload = {}, responseData = {};
    try {
      const placement = await Placement.find(placementId);
      if (!placement) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Placement' })
        };
        return;
      }
      const { coach_id, regional_director_id } =  await UserRepository.getCoachAndRegionalDirector(placement.created_by);
      if (![coach_id, regional_director_id].includes(userId)) {
        responseData = {
          success: false,
          code: 403,
          isInactive: false,
          redirect: false,
          message: Antl.formatMessage('messages.error.authorization')
        };
        return;
      }

      trx = await Database.beginTransaction();
      const previousStatusId = placement.placement_status_id === placementStatus.Pending_Update._id ? placement.previous_status_id : placement.placement_status_id;
      const placementUpdate = await PlacementSuggestedUpdate.create(
        {
          description,
          placement_id: placement.id,
          user_id: userId,
        },
        trx
      );

      placement.merge({
        placement_status_id: placementStatus.Pending_Update._id,
        previous_status_id: previousStatusId
      });
      await placement.save(trx);

      await trx.commit();

      eventPayload = {
        placement,
        previousStatusId,
        placementId: placement.id,
        entity: EntityTypes.Placement.default,
        payload: placementUpdate,
        operation: OperationType.Placement.SuggestedUpdate,
        userId
      };

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.creation', { entity: 'suggestion' }),
        code: 201,
        data: placementUpdate
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.default,
        payload: { exception: error.toString() },
        operation: OperationType.Placement.SuggestedUpdate,
        userId,
        successful_operation: false
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'creating', entity: 'suggestion' }),
      };
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.SuggestionUpdate, eventPayload);
      return responseData;
    }
  }

  /**
   * Returns a custom response that determines
   * the creation of an invoice
   *
   * @method createInvoice
   *
   * @param {Integer} placementId
   * @param {Integer} invoiceNumber
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async createInvoice(placementId, invoiceNumber, userId) {
    let trx, eventPayload = {}, responseData = {};
    try {
      const placement = await Placement.find(placementId);
      if (!placement) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Placement' }),
        };
        return;
      }

      trx = await Database.beginTransaction();
      const placementInvoice = await PlacementInvoice.create(
        {
          number: invoiceNumber,
          placement_id: placement.id,
          created_by: userId,
          updated_by: userId,
        },
        trx
      );

      placement.merge({
        placement_status_id: placementStatus.Invoiced._id,
        previous_status_id: placement.placement_status_id,
        last_invoice_date: placementInvoice.created_at
      });
      await placement.save(trx);

      await trx.commit();

      eventPayload = {
        placementId: placement.id,
        entity: EntityTypes.Placement.Invoice,
        payload: placementInvoice,
        operation: OperationType.Create,
        placement,
        userId
      };

      await placementInvoice.loadMany({
        user: (builder) =>
          builder.hideFields({ fields: [...userFields, 'job_title'] }).include([
            {
              relation: 'personalInformation',
              extend: [
                {
                  method: 'select',
                  params: ['id', 'full_name'],
                },
              ],
            },
          ]),
      });

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.creation', { entity: 'invoice' }),
        code: 201,
        data: placementInvoice
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.Invoice,
        payload: { exception: error.toString() },
        operation: OperationType.Create,
        userId,
        successful_operation: false
      };

      responseData = {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'creating', entity: 'invoice' })
      }
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.InvoiceCreated, eventPayload);
      return responseData;
    }
  }

  /**
   * Returns a custom response that determines
   * the update of an invoice
   *
   * @method updateInvoice
   *
   * @param {Integer} invoiceId
   * @param {Integer} invoiceNumber
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async updateInvoice(invoiceId, invoiceNumber, userId) {
    let  eventPayload = {}, responseData = {};
    try {
      const placementInvoice = await PlacementInvoice.find(invoiceId);
      if (!placementInvoice) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'invoice' }),
        };
        return;
      }

      placementInvoice.merge({
        number: invoiceNumber,
        updated_by: userId,
      });
      await placementInvoice.save();

      eventPayload = {
        placementId: placementInvoice.placement_id,
        entity: EntityTypes.Placement.Invoice,
        payload: placementInvoice,
        operation: OperationType.Update,
        userId
      };

      await placementInvoice.loadMany({
        user: (builder) =>
          builder.hideFields({ fields: [...userFields, 'job_title'] }).include([
            {
              relation: 'personalInformation',
              extend: [
                {
                  method: 'select',
                  params: ['id', 'full_name'],
                },
              ],
            },
          ]),
      });

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.update', { entity: 'invoice' }),
        code: 201,
        data: placementInvoice
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      eventPayload = {
        entity: EntityTypes.Placement.Invoice,
        payload: { exception: error.toString() },
        operation: OperationType.Update,
        userId,
        successful_operation: false
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'updating', entity: 'invoice' }),
      };
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.InvoiceUpdated, eventPayload);
      return responseData;
    }
  }

  /**
   * Returns a custom response that determines
   * the delete of an invoice
   *
   * @method deleteInvoice
   *
   * @param {Integer} invoiceId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async deleteInvoice(invoiceId, userId) {
    let trx, eventPayload = {}, responseData = {};
    try {
      const placementInvoice = await PlacementInvoice.find(invoiceId);
      if (!placementInvoice) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'invoice' }),
        };
        return;
      }
      const dataToUpdate = {
        last_invoice_date: null
      };
      trx = await Database.beginTransaction();
      await trx.table('placement_invoices').where('id', placementInvoice.id).del();

      const invoicesRes = await PlacementInvoice.query().where('placement_id', placementInvoice.placement_id).orderBy('created_at','desc').fetch();
      if (invoicesRes.rows.length <= 1) {
        dataToUpdate.placement_status_id = placementStatus.Pending_To_Invoiced._id;
        dataToUpdate.previous_status_id = placementStatus.Invoiced._id;
      }else{
        dataToUpdate.last_invoice_date = invoicesRes.rows[1].created_at;
      }
      await trx
        .table('placements')
        .where('id', placementInvoice.placement_id)
        .update(dataToUpdate);


      await trx.commit();

      eventPayload = {
        placementId: placementInvoice.placement_id,
        entity: EntityTypes.Placement.Invoice,
        payload: placementInvoice,
        operation: OperationType.Delete,
        userId
      };

      responseData =  {
        success: true,
        message: Antl.formatMessage('messages.success.delete', { entity: 'invoice' }),
        code: 200,
        data: placementInvoice
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.Invoice,
        payload: { exception: error.toString() },
        operation: OperationType.Delete,
        userId,
        successful_operation: false
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'deleting', entity: 'invoice' }),
      };
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.InvoiceDeleted, eventPayload);
      return responseData;
    }
  }

  async getInvoices(placementId) {
    try {
      const placement = await Placement.find(placementId);
      if (!placement) {
        return {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Placement' }),
        };
      }
      const invoices = await PlacementInvoice.query()
        .include([
          {
            relation: 'user',
            hideFields: { fields: [...userFields, 'job_title'] },
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name'],
                  },
                ],
              },
            ],
          },
        ])
        .where('placement_id', placement.id)
        .orderBy('created_at', 'desc')
        .fetch();

      return {
        success: true,
        code: 200,
        data: invoices,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'invoices' }),
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the creation of a payment
   *
   * @method createPayment
   *
   * @param {Integer} placementId
   * @param {Integer} amount
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async createPayment(placementId, amount, userId) {
    let eventPayload = {}, responseData = {};
    try {
      const placement = await Placement.find(placementId);
      if (!placement) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Placement' }),
        };
        return;
      }

      const placementPayment = await PlacementPayment.create({
        amount,
        placement_id: placement.id,
        created_by: userId,
        updated_by: userId,
      });

      eventPayload = {
        placementId: placementPayment.placement_id,
        entity: EntityTypes.Placement.Payment,
        payload: placementPayment,
        operation: OperationType.Create,
        placement,
        userId
      };

      await placementPayment.loadMany({
        user: (builder) =>
          builder.hideFields({ fields: [...userFields, 'job_title'] }).include([
            {
              relation: 'personalInformation',
              extend: [
                {
                  method: 'select',
                  params: ['id', 'full_name'],
                },
              ],
            },
          ]),
      });

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.creation', { entity: 'payment' }),
        code: 201,
        data: placementPayment
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      eventPayload = {
        entity: EntityTypes.Placement.Payment,
        payload: { exception: error.toString() },
        operation: OperationType.Create,
        userId,
        successful_operation: false
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'creating', entity: 'payment' }),
      };
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.PaymentCreated, eventPayload);
      return responseData;
    }
  }

  /**
   * Returns a custom response that determines
   * the update of a payment
   *
   * @method updatePayment
   *
   * @param {Integer} paymentId
   * @param {Integer} amount
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async updatePayment(paymentId, amount, userId) {
    let eventPayload = {}, responseData = {};
    try {
      const placementPayment = await PlacementPayment.find(paymentId);
      if (!placementPayment) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'payment' })
        };
        return;
      }

      placementPayment.merge({
        amount,
        updated_by: userId,
      });
      await placementPayment.save();

      eventPayload = {
        placementId: placementPayment.placement_id,
        entity: EntityTypes.Placement.Payment,
        payload: placementPayment,
        operation: OperationType.Update,
        userId
      };

      await placementPayment.loadMany({
        user: (builder) =>
          builder.hideFields({ fields: [...userFields, 'job_title'] }).include([
            {
              relation: 'personalInformation',
              extend: [
                {
                  method: 'select',
                  params: ['id', 'full_name'],
                },
              ],
            },
          ]),
      });

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.update', { entity: 'payment' }),
        code: 201,
        data: placementPayment
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      eventPayload = {
        entity: EntityTypes.Placement.Payment,
        payload: { exception: error.toString() },
        operation: OperationType.Update,
        userId,
        successful_operation: false
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'updating', entity: 'payment' }),
      };
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.PaymentUpdated, eventPayload);
      return responseData;
    }
  }

  /**
   * Returns a custom response that determines
   * the delete of a payment
   *
   * @method deletePayment
   *
   * @param {Integer} paymentId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async deletePayment(paymentId, userId) {
    let trx, eventPayload = {}, responseData = {};
    try {
      const placementPayment = await PlacementPayment.find(paymentId);
      if (!placementPayment) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'payment' }),
        };
        return;
      }

      trx = await Database.beginTransaction();
      await trx.table('placement_payments').where('id', placementPayment.id).del();

      await trx.commit();

      eventPayload = {
        placementId: placementPayment.placement_id,
        entity: EntityTypes.Placement.Payment,
        payload: placementPayment,
        operation: OperationType.Delete,
        userId
      };

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.delete', { entity: 'payment' }),
        code: 200,
        data: placementPayment,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      
      eventPayload = {
        entity: EntityTypes.Placement.Payment,
        payload: { exception: error.toString() },
        operation: OperationType.Delete,
        userId,
        successful_operation: false
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'deleting', entity: 'payment' }),
      };
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.PaymentDeleted, eventPayload);
      return responseData;
    }
  }

  async getPayments(placementId) {
    try {
      const placement = await Placement.find(placementId);
      if (!placement) {
        return {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Placement' }),
        };
      }
      const payments = await PlacementPayment.query()
        .include([
          {
            relation: 'user',
            hideFields: { fields: [...userFields, 'job_title'] },
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name'],
                  },
                ],
              },
            ],
          },
        ])
        .where('placement_id', placement.id)
        .orderBy('created_at', 'desc')
        .fetch();

      return {
        success: true,
        code: 200,
        data: payments,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'payments' }),
      };
    }
  }

  async getPreviews(filters = {}) {
    const { job_order_id, placement_id, candidate_id, sendout_id } = filters;

    const query = Placement.query()
      .hideFields({})
      .include([
        {
          relation: 'sendout',
        },
        {
          relation: 'splits.user.personalInformation',
        },
        {
          relation: 'status',
        },
        {
          relation: 'invoices',
          extend: [
            {
              method: 'orderBy',
              params: ['created_at'],
            },
          ],
        },
      ]);

    if (job_order_id) {
      const sendoutsValidQuery = Database.table('sendouts as so').where('so.job_order_id', job_order_id).select('id');
      query.whereIn('sendout_id', sendoutsValidQuery);
    }else if(candidate_id){
      const sendoutsValidQuery = Database.table('sendouts as so').where('so.candidate_id', candidate_id).select('id');
      query.whereIn('sendout_id', sendoutsValidQuery);
    }

    if (placement_id) {
      query.where('id', placement_id);
    }else if(sendout_id){
      query.where('sendout_id', sendout_id);
    }

    const placementRes = await query.orderBy('created_at', 'desc').fetch();
    const splitsUserPaths = {
      pathToUserValue: 'user.personalInformation.full_name', 
      pathToUserId: 'user.id'
    }
    const placementList = await Promise.all(
      placementRes.toJSON().map(async (placement) => ({
        id: placement.id,
        fee_amount: placement.fee_amount,
        start_date: placement.start_date,
        status: placement.status,
        invoice_number: placement.invoices[0] ? placement.invoices[0].number : null,
        candidate_recruiter: await this.formatItemSplitUser(placement.splits, { type: 'candidate', ...splitsUserPaths }),
        company_recruiter: await this.formatItemSplitUser(placement.splits, { type: 'company', ...splitsUserPaths }),
      }))
    );
    return placementList;
  }

  async formatItemSplitUser(split = [], { type, pathToUserValue, pathToUserId, evaluateOfficeCase = true }) {
    const values = await Promise.all(
      filter(split, { type }).map(async (val) => { 
        const userId = get(val, pathToUserId, null);
        const userValue = get(val, pathToUserValue, ''); 
        const specialOfficeCase = evaluateOfficeCase && (await UserRepository.isOfficeUser(userId) ||  UserRepository.containsOfficeSubstring(userValue));
        return specialOfficeCase ? 'OFFICE' : userValue;
      })
    );
    return compact(values).join('/');
  }

  async logChange(placementId, entity, operation, payload, userId, successful_operation) {
    try {
      await PlacementLog.create({
        placement_id: placementId,
        entity,
        operation,
        payload,
        created_by: userId,
        successful_operation
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }


  async getLogs(placementId) {
    try {
      const logs =  await PlacementLog.query()
        .hideFields({
          hideAuditFields : false,
          fields: ['payload']
        })
        .include([
          {
            relation: 'user',
            hideFields: { fields: [...userFields, 'job_title'] },
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name'],
                  },
                ],
              },
            ],
          },
        ])
        .where('placement_id',placementId)
        .where('successful_operation', true)
        .orderBy('created_at','desc')
        .fetch();

      return {
        success: true,
        code: 200,
        data: logs,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'logs' }),
      };
    }
  }

  
 /**
   * Returns a custom response that determines
   * a fall off request
   *
   * @method updatePayment
   *
   * @param {Integer} placementId
   * @param {Integer} placement_fall_off_reason_id
   * @param {String} fall_off_reason
   * @param {Boolean} candidate_still_available
   * @param {Boolean} job_still_open
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async requestFallOff(placementId,  fallOffParams, userId) {
    let trx, eventPayload = {},
      responseData = {};
    try {
      const {
        placement_fall_off_reason_id: fallOffId = null,
        fall_off_reason: reason = null,
        candidate_still_available: caStillAvailable = false,
        job_still_open: joStillOpen = false,
      } = fallOffParams;
      const fallOffOtherReasonId = 7;
      const placement = await Placement.find(placementId);
      if (!placement) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'placement' })
        };
        return;
      }
      const fallOffReason = await PlacementFallOffReason.find(fallOffId);
      if (!fallOffReason) {
        responseData = {
          code: 400,
          message: Antl.formatMessage('messages.validation.invalid.single', {
            field: 'fall off reason',
          })
        };
        return;
      }
      trx = await Database.beginTransaction();

      const previousStatusId = placement.placement_status_id;
      placement.merge({
        placement_status_id: placementStatus.Pending_To_FallOff._id,
        placement_fall_off_reason_id: fallOffId,
        fall_off_reason: fallOffId !== fallOffOtherReasonId ? fallOffReason.title : reason,
        candidate_still_available: caStillAvailable,
        job_still_open: joStillOpen,
        updated_by: userId,
        previous_status_id:  previousStatusId,
        fall_off_request_date: moment()
      });

      await placement.save(trx);
      await trx.commit();

      eventPayload = {
        placementId: placement.id,
        entity: EntityTypes.Placement.default,
        operation: OperationType.Placement.RequestFallOff,
        placement,
        payload:placement,
        previousStatusId: placement.previous_status_id,
        userId
      };

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.update', { entity: 'placement' }),
        code: 201,
        data: placement
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.default,
        payload: { exception: error.toString() },
        operation: OperationType.Placement.RequestFallOff,
        userId,
        successful_operation: false,
      };

      responseData = {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'updating', entity: 'placement' }),
      };
    } finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.RequestFallOff, eventPayload);
      return responseData;
    }
  }

  /**
   * Returns a custom response that determines
   * a fall off placement
   *
   * @method updatePayment
   *
   * @param {Integer} placementId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async markAsFallOff(placementId, userId) {
    let trx, eventPayload = {},
      responseData = {};
    try {
      const placement = await Placement.find(placementId);
      if (!placement) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'placement' })
        };
        return;
      }
      if (placement.placement_status_id != placementStatus.Pending_To_FallOff._id) {
        responseData = {
          code: 400,
          message: Antl.formatMessage('messages.validation.requestFallOff', { action: 'fall off' })
        };
        return;
      }
      const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
      const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
      const sendout = await Sendout.find(placement.sendout_id);
      const { candidate_id, job_order_id } = sendout;

      trx = await Database.beginTransaction();

      const caStillAvailable = placement.candidate_still_available;
      const joStillOpen = placement.job_still_open;
      placement.merge({
        placement_status_id: placementStatus.FallOff._id,
        fall_off_date : moment(),
        updated_by: userId
      });

      await placement.save(trx);

      await CandidateRepository.updateStatus(candidate_id, caStillAvailable ? CandidateStatusSchemes.Ongoing : CandidateStatusSchemes.Inactive, trx);
      await CandidateRepository.updateType(candidate_id, caStillAvailable ? CandidateTypeSchemes.Alpha : CandidateTypeSchemes.CantHelp, trx);

      await JobOrderRepository.updateStatus(job_order_id, joStillOpen ? JobOrderStatusSchemes.Ongoing : JobOrderStatusSchemes.Inactive, trx);
      await JobOrderRepository.updateType(job_order_id, joStillOpen ? JobOrderTypeSchemes.SearchAssignment : JobOrderTypeSchemes.CantHelp, trx);
      
      await trx.commit();

      eventPayload = {
        placementId: placement.id,
        entity: EntityTypes.Placement.default,
        operation: OperationType.Placement.FallOff,
        placement,
        payload:placement,
        previousStatusId: placement.previous_status_id,
        userId
      };

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.update', { entity: 'placement' }),
        code: 201,
        data: placement
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.default,
        payload: { exception: error.toString() },
        operation: OperationType.Placement.FallOff,
        userId,
        successful_operation: false,
      };

      responseData = {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'updating', entity: 'placement' }),
      };
    } finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.FallenOff, eventPayload);
      return responseData;
    }
  }


  /**
   * Returns a custom response that determines
   * a revert fall off request
   *
   * @method updatePayment
   *
   * @param {Integer} placementId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async requestRevertFallOff(placementId, userId) {
    let trx, eventPayload = {}, responseData = {};
    try {
      const placement = await Placement.find(placementId);
      if (!placement) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'placement' })
        };
        return;
      }
      trx = await Database.beginTransaction();

      placement.merge({
        placement_status_id: placementStatus.Pending_To_Revert_FallOff._id,
        updated_by: userId,
        fall_off_revert_request_date: moment()
      });

      await placement.save(trx);
    
      await trx.commit();

      eventPayload = {
        placementId: placement.id,
        entity: EntityTypes.Placement.default,
        operation: OperationType.Placement.RequestRevertFallOff,
        previousStatusId: placement.previous_status_id,
        placement,
        payload:placement,
        userId
      };

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.update', { entity: 'placement' }),
        code: 201,
        data: placement
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.default,
        payload: { exception: error.toString() },
        operation: OperationType.Placement.RequestRevertFallOff,
        userId,
        successful_operation: false,
      };

      responseData = {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'updating', entity: 'placement' }),
      };
    } finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.RequestRevertFallOff, eventPayload);
      return responseData;
    }
  }

  /**
   * Returns a custom response that determines
   * a fall off revert
   *
   * @method updatePayment
   *
   * @param {Integer} placementId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
   async revertFallOff(placementId, userId) {
    let trx, eventPayload = {}, responseData = {};
    try {
      const placement = await Placement.find(placementId);
      if (!placement) {
        responseData = {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'placement' })
        };
        return;
      }
      if (placement.placement_status_id != placementStatus.Pending_To_Revert_FallOff._id) {
        responseData = {
          code: 400,
          message: Antl.formatMessage('messages.validation.requestFallOff', { action: 'revert' })
        };
        return;
      }
      const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
      const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
      const sendout = await Sendout.find(placement.sendout_id);
      const { candidate_id, job_order_id } = sendout;
      trx = await Database.beginTransaction();

      placement.merge({
        previous_status_id: placement.placement_status_id,
        placement_status_id: placement.previous_status_id,
        placement_fall_off_reason_id: null,
        fall_off_reason: null,
        fall_off_date : null,
        fall_off_request_date: null,
        fall_off_revert_request_date: null,
        candidate_still_available: null,
        job_still_open: null,
        updated_by: userId
      });

      await placement.save(trx);

      const candidateStatusId = CandidateStatusSchemes.Placed;
      const jobStatusId = JobOrderStatusSchemes.Placed;

      const candidateTypeId = CandidateTypeSchemes.Alpha;
      const jobTypeId = JobOrderTypeSchemes.SearchAssignment;

      await CandidateRepository.updateStatus(candidate_id, candidateStatusId, trx);
      await CandidateRepository.updateType(candidate_id, candidateTypeId, trx);

      await JobOrderRepository.updateStatus(job_order_id, jobStatusId, trx);
      await JobOrderRepository.updateType(job_order_id, jobTypeId, trx);
      
      await trx.commit();

      eventPayload = {
        placementId: placement.id,
        entity: EntityTypes.Placement.default,
        operation: OperationType.Placement.RevertFallOff,
        previousStatusId: placement.previous_status_id,
        placement,
        payload:placement,
        userId
      };

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.update', { entity: 'placement' }),
        code: 201,
        data: placement
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.Placement.default,
        payload: { exception: error.toString() },
        operation: OperationType.Placement.RevertFallOff,
        userId,
        successful_operation: false,
      };

      responseData = {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'updating', entity: 'placement' }),
      };
    } finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Placement.RevertFallOff, eventPayload);
      return responseData;
    }
  }

  async updateCandidateSourceType(sendoutId, sourceTypeId, trx = null){
    trx && await trx.table('candidates').whereIn('id',Database.raw('SELECT candidate_id from sendouts where id = ?',[sendoutId])).update({ source_type_id: sourceTypeId })
  }

  async updateJobSourceType(sendoutId, sourceTypeId, trx = null){
    trx && await trx.table('job_orders').whereIn('id',Database.raw('SELECT job_order_id from sendouts where id = ?',[sendoutId])).update({ job_order_source_type_id: sourceTypeId })
  }

    /**
   * Post a msg on the deal team related to the placement approval
   *
   * @method postDealMessage
   *
   * @param {Object} placement
   *
   */
  async postDealMessage(placement){
    try {
      const { id, fee_amount, sendout_id, monthly_amount, fee_agreement_payment_scheme_id } = placement;
      const amount = fee_agreement_payment_scheme_id == FeeAgreementPaymentSchemes.Conversion ? monthly_amount : fee_amount;
      const sendout = await Sendout.find(sendout_id);
      const { job_order_id } = sendout;
      const { specialty: { title: specialtyTitle, industry: { title: industryTitle } = {} } = {} } = (
        await Company.query()
          .include([
            {
              relation: 'specialty.industry'
            }
          ])
          .whereIn('id', Database.table('job_orders').where('id', job_order_id).select('company_id').first())
          .first()
      ).toJSON();
      const splits = await Database.table('placement_splits as ps')
        .select(['ps.is_channel_partner', 'ps.user_id', 'ps.type', 'usr.initials', 'ps.placement_id', 'usr.user_name'])
        .innerJoin('v_users as usr', 'ps.user_id', 'usr.id')
        .where('ps.placement_id', id);
      const splitsUserPaths = {
        pathToUserValue: 'user_name', 
        pathToUserId: 'user_id'
      }
      const candidateUsers = await this.formatItemSplitUser(splits, { type: 'candidate', ...splitsUserPaths });
      const companyUsers = await this.formatItemSplitUser(splits, { type: 'company', ...splitsUserPaths });

      const initials = `${companyUsers}${companyUsers.length > 0 && candidateUsers.length > 0 ? ', ' : ''}${candidateUsers}`;
      const industry = `${specialtyTitle ? specialtyTitle + '/' : ''}${industryTitle || ''}`;
      const feeAmount = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount);

      const title = `${initials} ${feeAmount} ${fee_agreement_payment_scheme_id == FeeAgreementPaymentSchemes.Conversion ? 'New Conversion' : ''} ${industry}`;

      await InstantMessagingService.sendMessage({ configKey: 'placementOnDealGlips', title, text: null });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async listForEstimation(queryParams){
    try {
      const PlacementEstimateList = use('App/Helpers/PlacementEstimateList');
      const list = new PlacementEstimateList();
      return {
        sucess: true,
        code: 200,
        data: await list.get(queryParams)
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'placements',
        }),
      };
    }
  }
}

module.exports = PlacementRepository;
