'use strict'
const appInsights = require("applicationinsights");
const FeeAgreementRepository = new (use('App/Helpers/FeeAgreementRepository'))();
const {uploadFile, getMultipartConfig} = use('App/Helpers/FileHelper');
const UserHasTempFile = use('App/Models/UserHasTempFile');
const path = require('path');
const { validFileFormats, contentDispositionHeaderBuilders } = use('App/Helpers/Globals');
const { v4: uuidv4 } = require('uuid');
const Antl = use('Antl');

const FeeAgreementScheduledJobsWorker = new (use('App/Helpers/ScheduledJobs/FeeAgreementScheduledJobsWorker'));
class FeeAgreementController {
  constructor() {
    this.expectedStatusesMap = {
      '400': true,
      '403': true,
      '422': true,
      '500': true,
    };
  }

  _handleError(error, operation, response) {
    appInsights.defaultClient.trackException({exception: error});
    return response.status(this.expectedStatusesMap[error.code] ? error.code : 500).send({
      message: error.message || Antl.formatMessage('feeAgreement.error.operationFailed', { operation })
    });
  }
  async index({request, response, auth}) {
    const timezone = request.header('Timezone');
    try {
      const filters = request.only([
        'fee_agreement_status_id',
        'fee_agreement_status_ids',
        'company_id',
        'recruiter_id',
        'coach_id',
        'regional_director_id',
        'min_guarantee_days',
        'max_guarantee_days',
        'min_fee_percentage',
        'max_fee_percentage',
        'responsible_role_id',
        'keyword',
        'start_date_range',
        'end_date_range',
        'start_created_at',
        'end_created_at',
        'start_validated_date',
        'end_validated_date',
        'start_signed_date',
        'end_signed_date',
        'industry_id',
        'specialty_id',
        'subspecialty_id',
        'guarantee_days',
        'specific_fee_agreement_status_ids',
        'status_ids',
        'status_groups_ids',

        'companyIds',
        'countryIds',
        'recruiterIds',
        'coachIds',
        'regionalDirectorIds',
        'responsibleRoleIds',
        'industryIds',
        'specialtyIds',
        'subspecialtyIds',
        'guaranteeDaysIn',
        'signatureProcessTypeId'
      ]);
      const orderOptions = request.only([
        'orderBy',
        'direction'
      ]);
      const paginationOptions = request.only([
        'page',
        'perPage'
      ]);
      const userId = auth.current.user.id;
      const feeAgreements = await FeeAgreementRepository.listForUser({timezone, ...filters}, orderOptions, paginationOptions, userId);
      return response.status(200).send(feeAgreements);
    } catch(error) {
      return this._handleError(error, 'retrieving Fee Agreements', response);
    }
  }

  async getFeeAgreementStatuses({response, auth}) {
    try {
      const userId = auth.current.user.id;
      const feeAgreements = await FeeAgreementRepository.getFeeAgreementStatusesForUser(userId);
      return response.status(200).send(feeAgreements);
    } catch(error) {
      return this._handleError(error, 'retrieving Fee Agreements', response);
    }
  }

  async getResponsibleRoles({response, auth}) {
    try {
      const userId = auth.current.user.id;
      const roles = await FeeAgreementRepository.getResponsibleRolesForUser(userId);
      return response.status(200).send(roles);
    } catch(error) {
      return this._handleError(error, 'retrieving Fee Agreement responsible roles', response);
    }
  }

  async getContractTemplates({request, response}) {
    try {
      const {page = 1, pageSize = 10} = request.only(['page', 'pageSize']);
      const templates = await FeeAgreementRepository.getContractTemplates(page, pageSize);
      return response.status(200).send(templates);
    } catch(error) {
      return this._handleError(error, 'retrieving templates', response);
    }
  }

  async coachValidation({request, response, auth}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const result = await FeeAgreementRepository.coachValidation(id, userId);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'validating Fee Agreement', response);
    }
  }

  async coachDeclination({request, response, auth}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const declinationDetails = request.only([
        'declined_fields',
        'declination_notes'
      ]);
      const result = await FeeAgreementRepository.coachDeclination(id, userId, declinationDetails);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'declining Fee Agreement', response);
    }
  }

  async operationsDeclination({request, response, auth}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const declinationDetails = request.only([
        'declined_fields',
        'declination_notes'
      ]);
      const result = await FeeAgreementRepository.operationsDeclination(id, userId, declinationDetails);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'declining Fee Agreement', response);
    }
  }


  async sendToCoachValidation({request, response, auth}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const changedFields = request.only([
        'guarantee_days',
        'fee_percentage',
        'verbiage_changes',
        'flat_fee_amount'
      ]);
      const result = await FeeAgreementRepository.sendToCoachValidation(id, userId, changedFields);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'sending Fee Agreement', response);
    }
  }

  async operationsValidation({request, response, auth}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const result = await FeeAgreementRepository.operationsValidation(id, userId);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'validating Fee Agreement', response);
    }
  }

  async sendToOperationsValidation({request, response, auth}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const changedFields = request.only([
        'guarantee_days',
        'fee_percentage',
        'verbiage_changes',
        'flat_fee_amount'
      ]);
      const result = await FeeAgreementRepository.sendToOperationsValidation(id, userId, changedFields);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'sending Fee Agreement', response);
    }
  }

  async show({request, response}) {
    try {
      const id = request.params.id;
      const result = await FeeAgreementRepository.show(id);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'getting Fee Agreement', response);
    }
  }

  async processHelloSignEvent({request, response}) {
    const json = request.input('json');
    try {
      const event = JSON.parse(json);
      await FeeAgreementRepository.handleHelloSignEvent(event);
      return response.status(200).send('Hello API Event Received');
    } catch(error) {
      return this._handleError(error, 'processing HelloSign Event', response);
    }
  }

  async createTemplateDraft({request, response}) {
    const title = request.input('title');
    try {
      request.multipart.file('file', getMultipartConfig(), async (file) => {
        await file.runValidations();
        const error = file.error();
        if (error.message) {
          return response.status(400).send({
            message: error.message,
          });
        }
  
        const fileName = `${new Date().getTime()}.${file.extname}`;
        const absolutePath = await uploadFile('fee_agreement_template_files/' + fileName, file.stream);
  
        if (!absolutePath) {
          return this._handleError(error, 'uploading template file', response);;
        }

        const draft = await FeeAgreementRepository.createTemplateDraft(title, absolutePath);
        return response.status(201).send( { ...draft, file_name: file.clientName});
      });
      await request.multipart.process();
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      return this._handleError(error, 'uploading template file', response);
    }
  }

  async sendReminder({request, auth, response}) {
    const id = request.params.id;
    const userId = auth.current.user.id;
    try {
      const result = await FeeAgreementRepository.sendReminder(id, userId);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'sending Reminder', response);
    }
  }

  async createSignatureRequestPreview({request, auth, response}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const templateId = request.input('template_id');
      const subject = request.input('subject');
      const result = await FeeAgreementRepository.createSignatureRequestPreview(id, templateId, subject, userId);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'creating fee agrement preview', response);
    }
  }

  async getSignedFeeAgreementsByCompany({request, response}) {
    try {
      const companyId = request.input('companyId');
      const result = await FeeAgreementRepository.getSignedFeeAgreementsByCompany(companyId);
      return response.ok(result);
    } catch(error) {
      return this._handleError(error, 'getting signed fee agreements', response);
    }
  }

  async getFeeAgreementGuaranteeDaysOptions({response}) {
    try {
      const feeAgreementGuaranteeDaysOptions = await FeeAgreementRepository.getFeeAgreementGuaranteeDaysOptions();
      return response.status(200).send(feeAgreementGuaranteeDaysOptions);
    } catch(error) {
      return this._handleError(error, 'getting fee agreement guarantee days options', response);
    }
  }

  async getFeeAgreementGuaranteeDaysOptionsByPaymentScheme({response}) {
    try {
      const feeAgreementGuaranteeDaysOptions = await FeeAgreementRepository.getFeeAgreementGuaranteeDaysOptionsByPaymentScheme();
      return response.status(200).send(feeAgreementGuaranteeDaysOptions);
    } catch(error) {
      return this._handleError(error, 'getting signed fee agreements', response);
    }
  }

  async getHistoryLog({request, response}) {
    try {
      const id = request.params.id;
      const logs = await FeeAgreementRepository.getHistoryLog(id);
      return response.status(200).send(logs);
    } catch(error) {
      return this._handleError(error, 'getting fee agreement history log', response);
    }
  }

  async getCountSummaryByStatus({request, auth, response}) {
    try {
      const statusIds = request.input('status_ids');
      const userId = auth.current.user.id;
      const filters = request.only([
        'fee_agreement_status_id',
        'fee_agreement_status_ids',
        'company_id',
        'recruiter_id',
        'coach_id',
        'regional_director_id',
        'min_guarantee_days',
        'max_guarantee_days',
        'min_fee_percentage',
        'max_fee_percentage',
        'responsible_role_id',
        'keyword',
        'start_date_range',
        'end_date_range',
        'industry_id',
        'specialty_id',
        'subspecialty_id',
        'guarantee_days',
        'specific_fee_agreement_status_ids',
        'status_ids',
        'status_groups_ids',

        'company_ids',
        'recruiter_ids',
        'coach_ids',
        'regional_director_ids',
        'responsible_role_ids',
        'industry_ids',
        'specialty_ids',
        'subspecialty_ids',
        'guarantee_days_in',
      ]);
      const results = await FeeAgreementRepository.getCountSummaryByStatus(userId, statusIds, filters);
      return response.status(200).send(results);
    } catch(error) {
      return this._handleError(error, 'getting summary count by status', response);
    }
  }
  
  async voidContract({request, auth, response}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const voidedReason = request.input('voidedReason');
      const result = await FeeAgreementRepository.voidContract(id, userId, voidedReason);
      return response.status(result.code).send(result.data);
    } catch(error) {
      return this._handleError(error, 'voiding Fee Agreement', response);
    }
  }

  async cancelValidationRequest({request, auth, response}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const result = await FeeAgreementRepository.cancelValidationRequest(id, userId);
      return response.ok(result);
    } catch(error) {
      return this._handleError(error, 'cancelling Fee Agreement validation request', response);
    }
  }

  async getTemplateFileByAgreementId({request, response}) {
    try {
      const id = request.params.id;
      const fileName = `template-${id}.pdf`;
      const result = await FeeAgreementRepository.getTemplateByAgreementId(id);
  
      if(result.success) {
        this.dumpPdfFile(fileName, result.data, response);
      } else {
        return response.status(result.code).send(result);
      }
    } catch(error) {
      return this._handleError(error, 'getting Fee Agreement template file', response);
    }
  }

  async getTemplateFileByTemplateId({request, response}) {
    try {
      const templateId = request.params.id;
      const fileName = `template-${templateId}.pdf`;
      const result = await FeeAgreementRepository.getTemplateById(templateId);
  
      if(result.success) {
        this.dumpPdfFile(fileName, result.data, response);
      } else {
        return response.status(result.code).send(result);
      }
    } catch(error) {
      return this._handleError(error, 'getting template file', response);
    }
  }

  async dumpPdfFile(fileName, stream, response) {
    const contentDispositionHeaderBuilder = contentDispositionHeaderBuilders['download'];
    const contentDispositionHeader = contentDispositionHeaderBuilder(fileName);
    const contentTypeHeader = validFileFormats['pdf'];

    response.implicitEnd = false;
    response.response.setHeader('Content-type', contentTypeHeader);
    response.response.setHeader('Content-disposition', contentDispositionHeader);
    stream.pipe(response.response);
  }
  
  async getTemplatesIds({response, auth}) {
    try {
      const result = await FeeAgreementRepository.getTemplatesIds();
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'getting templates information', response);
    }
  }

  async updateEmails({request, response, auth}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const updateSignersInfo = request.only([
        'email',
        'cc_emails',
        'update_ha'
      ]);
      const result = await FeeAgreementRepository.updateEmails(id, userId, updateSignersInfo);
      return response.status(result.code).send(result.success ? result.data : result);
    } catch(error) {
      return this._handleError(error, 'updating fee agreement emails', response);
    }
  }

  async restoreExpired({request, auth, response}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const result = await FeeAgreementRepository.restoreExpired(id, userId);
      return response.ok(result);
    } catch(error) {
      return this._handleError(error, 'restoring expired fee agreement', response);
    }
  }

  async resendThroughDocuSign({request, auth, response}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const result = await FeeAgreementRepository.resendThroughDocuSign(id, userId);
      return response.ok(result);
    } catch(error) {
      return this._handleError(error, 'resending fee agreement through docusign', response);
    }
  }

  async createTemporaryFile({request, auth, response}) {
    const multipartConfig = {
      size: '5mb',
      extnames: ['pdf'],
    };
    try {
      const user_id = auth.current.user.id;
      request.multipart.file('file', multipartConfig, async (file) => {
        await file.runValidations();
        const error = file.error();
        if (error.message) {
          return response.status(400).send({
            message: error.message,
          });
        }
        const originalName = path.parse(file.clientName).name;
        const fileName = `temp-${uuidv4()}.${file.extname}`;
        const absolutePath = await uploadFile('tmp/' + fileName, file.stream);
        if (!absolutePath) {
          const error = {
            message: 'There was a problem while uploading the attachment'
          };
          return this._handleError(error, 'uploading fee agreement file', response);
        }
        const userTempFile = await UserHasTempFile.create({
          user_id,
          url: absolutePath,
          file_name: fileName,
          original_name: `${originalName}.${file.extname}`,
        });

        return response.status(201).send(userTempFile);
      });
      await request.multipart.process();
    } catch(error) {
      return this._handleError(error, 'uploading fee agreement file', response);
    }
  }

  async operationsValidationForUnmanaged({request, response, auth}) {
    try {
      const userId = auth.current.user.id;
      const id = request.params.id;
      const inputData = request.all();
      return await FeeAgreementRepository.operationsValidationForUnmanaged({id, inputData, userId});
    } catch(error) {
      return this._handleError(error, 'validating fee agreement', response);
    }
  }

  async getOverridableUsers({ response, auth }) {
    try {
      const userId = auth.current.user.id;
      return await FeeAgreementRepository.getOverridableUsers(userId);
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      return this._handleError(error, 'loading On Behalf Users', response);
    }
  }

  async sendUnsignedAgreements({ response }) {
    const operation = 'unsigned agreements email';
    
    try {
      const emailResponse = await FeeAgreementRepository.sendUnsignedAgreements();
      if(!emailResponse.success) throw emailResponse.message || `Unexpected error while ${operation}`;

      return response.status(200).send(emailResponse);
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      return this._handleError(error, operation, response);
    }
  }

  async expireFeeAgreements() {
    const reportError = (error) => {
      appInsights.defaultClient.trackException({exception: error});
    };
    FeeAgreementScheduledJobsWorker.expireFeeAgreements().then().catch(reportError);
    FeeAgreementScheduledJobsWorker.sendExpirationReminder().then().catch(reportError);
  }
}

module.exports = FeeAgreementController
