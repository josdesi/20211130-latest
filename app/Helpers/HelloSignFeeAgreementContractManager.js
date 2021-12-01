'use strict';

const HelloSign = use('Services/HelloSign');
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const { FeeAgreementPaymentSchemes, FeeAgreementStatus } = use('App/Helpers/Globals');
class HelloSignFeeAgreementContractManager {
  constructor(feaAgreementConfiguration) {
    this.feeAgreementConfiguration = feaAgreementConfiguration;
  }

  /**
   * Creates a Signature Request for a CompanyFeeAgreement using the hellosign API.
   * @param {CompanyFeeAgreement} feeAgreement 
   * @param {Company} company 
   * @param {HiringAuthority} hiringAuthority
   */

   async sendContract({feeAgreement, company, hiringAuthority, productionDirector, userId}) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const { defaultPayload, defaultCCRole } = config.data.signatureRequest;
    const templateId = await this.getCorrespondingTemplateId(feeAgreement);
    const templateDetails = await HelloSign.getTemplateDetails(templateId);
    const customFieldsThatApply = templateDetails.template.custom_fields.map(({name}) => name);
    const customFields = this.formatCustomFields({hiringAuthority, feeAgreement, productionDirector, company});
    const currentCustomFields = Object.keys(customFields);
    currentCustomFields.forEach(field => {
      if (!customFieldsThatApply.includes(field)) {
        delete customFields[field];
      }
    })
    
    
    const cc_emails = await this.getFeeAgreementCCEmails(feeAgreement, defaultCCRole, userId); 
    const requestPayload = {
      ...defaultPayload,
      subject: `${company.name} service agreement with gpac`,
      metadata: {feeAgreementId: feeAgreement.id, companyId: company.id, senderUserId: userId},
      template_id: templateId,
      custom_fields: customFields,
      signers: await this.formatSigners(hiringAuthority, productionDirector),
      ccs: cc_emails
    };
    return await HelloSign.createSignatureRequest(requestPayload);
  }

  async getCorrespondingTemplateId(feeAgreementData) {
    const config = this.feeAgreementConfiguration;
    const feeAgreementDefaults  = config.defaultValues;
    if (feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Flat) {
      if (feeAgreementData.guarantee_days) {
        return feeAgreementDefaults.template_ids.flat_with_guarantee;
      } else {
        return feeAgreementDefaults.template_ids.flat_without_guarantee
      }
    } else if (
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Standard || 
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Conversion||
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.BaseSalary) {
      return feeAgreementDefaults.template_ids[feeAgreementData.fee_agreement_payment_scheme_id];
    }
    return feeAgreementDefaults.template_ids[FeeAgreementPaymentSchemes.Standard];
  }

  async voidContract(feeAgreement) {
    const signatureRequest = await HelloSign.getSignatureRequest(feeAgreement.contract_id);
    if (!signatureRequest) {
      throw {
        success: false,
        code: 404,
        message: 'No request signature was found for the current fee agreement' 
      };
    }
    await HelloSign.cancelSignatureRequest(feeAgreement.contract_id);
  }

  async getSignatureEmailBySignerRole(feeAgreement, signerRole) {
    const signatureRequest = await HelloSign.getSignatureRequest(feeAgreement.contract_id);
    if (!signatureRequest) {
      return false;
    }

    const searchedSignerRole = signatureRequest.signature_request.signatures.find(
      ({ signer_role }) => signer_role === signerRole
    );
    return searchedSignerRole.signer_email_address;
  }

  async updateHiringAuthoritySignerEmail(feeAgreement, newEmail) {
    const signatureRequest = await HelloSign.getSignatureRequest(feeAgreement.contract_id);
    if (!signatureRequest) {
      return false;
    }

    const searchedSignerRole = signatureRequest.signature_request.signatures.find(
      ({ signer_role }) => signer_role === 'Hiring Authority'
    );
    return await HelloSign.updateEmails(feeAgreement.contract_id, searchedSignerRole.signature_id, newEmail);
  }

  formatCustomFields({feeAgreement, hiringAuthority, productionDirector, company}) {
    return {
      guarantee_days: this.formatOrdinal(feeAgreement.guarantee_days),
      fee_percentage: this.formatPercentage(feeAgreement.fee_percentage),
      hiring_authority_name: hiringAuthority.full_name,
      company_name: company.name,
      gpac_production_director_name: productionDirector.personalInformation.full_name,
      flat_fee_amount: this.formatMoney(feeAgreement.flat_fee_amount),
      fee_percent_integer: this.formatInteger(feeAgreement.fee_percentage),
      fee_percent_ordinal: this.formatOrdinal(this.formatInteger(feeAgreement.fee_percentage)),
    };
  }

  formatOrdinal(n) {
    let s = ["th", "st", "nd", "rd"];
    let v = n%100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }

  formatInteger(input) {
    const inputInNumber = typeof input === 'number' ? input : Number(input);
    return Number.parseInt(inputInNumber).toString();
  }

  formatNumber(percentage) {
    const percentageInNumber = typeof percentage === 'number' ? percentage : Number(percentage);
    return percentageInNumber.toFixed(2);
  }

  formatPercentage(percentage) {
    const percentageInNumber = typeof percentage === 'number' ? percentage : Number(percentage);
    return `${percentageInNumber.toFixed(2)}%`;
  }

  formatMoney(number) {
    if (number === null || number === undefined) return '';
        return new Intl.NumberFormat('en', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(number);
  }

  async getFeeAgreementCCEmails(feeAgreement, ccRole) {
    const coach = await feeAgreement.coach().fetch();
    const creator = await feeAgreement.creator().fetch();
    const emailsWithRepeatedElements = [...feeAgreement.cc_emails, coach.email, creator.email];
    const feeAgreementCCEmails = [...new Set(emailsWithRepeatedElements)];

    const cc_emails =feeAgreementCCEmails.map((email, index) => {
      return {
        email_address: email,
        role_name: `${ccRole}_${index + 1}`
      }
    });
    return cc_emails;
  }

  async formatSigners(hiringAuthority, productionDirector) {
    const feeAgreementConfiguration = this.feeAgreementConfiguration;
    const { hiringAuthoritySigner, productionDirectorSigner } = feeAgreementConfiguration.signatureRequest;

    return [
      {
        ...hiringAuthoritySigner,
        name: hiringAuthority.full_name,
        email_address: hiringAuthority.work_email
      },
      {
        ...productionDirectorSigner,
        email_address: productionDirector.email,
        name: productionDirector.personalInformation.full_name
      }
    ];
  }

  async sendReminder(feeAgreement) {
    const signatureRequest = await HelloSign.getSignatureRequest(feeAgreement.contract_id);
    if (!signatureRequest) {
      return {
        success: false,
        code: 404,
        message: 'Signature request not found',
      };
    }
    const signerRoleToFind = feeAgreement.fee_agreement_status_id == FeeAgreementStatus.PendingHiringAuthoritySignature ? 'Hiring Authority' : 'Gpac Production Director';
    const signature = signatureRequest.signature_request.signatures.find(
      ({ signer_role }) => signer_role === signerRoleToFind
    );
    if (!signature) {
      return {
        success: false,
        code: 404,
        message: 'Signer not found',
      };
    }
    const payload = {
      signatureRequestId: feeAgreement.contract_id,
      email: signature.signer_email_address
    };
    return await HelloSign.sendReminder(payload);
  }

  async getFilesInBase64(feeAgreement) {
    return await HelloSign.getFilesInBase64(feeAgreement.contract_id, {file_type: 'pdf'});
  }

  async checkIfContractExists(feeAgreement) {
    const signatureRequest = await HelloSign.getSignatureRequest(feeAgreement.contract_id);
    return !!signatureRequest;
  }
}

module.exports = HelloSignFeeAgreementContractManager;
