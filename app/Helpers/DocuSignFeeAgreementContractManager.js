'use strict';

const DocuSign = use('Services/DocuSign');
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const { FeeAgreementPaymentSchemes } = use('App/Helpers/Globals');

class DocuSignFeeAgreementContractManager {

  constructor (feeAgreementConfiguration, docuSignConfiguration) {
    this.docuSignConfiguration = docuSignConfiguration;
    this.feeAgreementConfiguration = feeAgreementConfiguration;
  }

  static async buildWithDefaultConfiguration() {
    const docuSignConfiguration = await ModulePresetsConfigRepository.getById('docuSignConfiguration');
    const feeAgreementConfiguration = await ModulePresetsConfigRepository.getById('feeAgreement');
    const docuSignContractManager = new DocuSignFeeAgreementContractManager(docuSignConfiguration, feeAgreementConfiguration);
    return docuSignContractManager;
  }

  /**
   * Creates a Signature Request for a CompanyFeeAgreement using the Docusign API.
   * @param {CompanyFeeAgreement} feeAgreement 
   * @param {Company} company 
   * @param {HiringAuthority} hiringAuthority
   */

   async sendContract({feeAgreement, hiringAuthority, productionDirector, company}) {
    const requestPayload = {
      templateId: await this.getCorrespondingTemplateId(feeAgreement),
      templateRoles: await this.buildTemplateRoles({feeAgreement, hiringAuthority, productionDirector, company}),
      isDynamicEnvelope: true,
      status: 'sent',
      eventNotification: {
        envelopeEventStatusCode: ['Draft', 'Sent', 'Delivered', 'Completed', 'Declined', 'Voided'],
        eventData: {
          format: 'json',
          includeData: ['recipients'],
          version: 'restv2.1'
        }
      }
    };
    return await DocuSign.sendEnvelope(requestPayload);
  }

  async buildTemplateRoles({feeAgreement, hiringAuthority, productionDirector, company}) {
    return [
      await this.buildHiringAuthorityTemplateRole({feeAgreement, hiringAuthority, productionDirector, company}),
      this.buildProductionDirectorTemplateRole({productionDirector}),
      ...(await this.buildCarbonCopies(feeAgreement))
    ];
  }
  
  async buildCarbonCopies(feeAgreement) {
    const coach = await feeAgreement.coach().fetch();
    const creator = await feeAgreement.creator().fetch();
    const emailsWithRepeatedElements = [...feeAgreement.cc_emails, coach.email, creator.email];
    const feeAgreementCCEmails = [...new Set(emailsWithRepeatedElements)];

    const carbonCopies = feeAgreementCCEmails.map((email, index) => {
      return {
        email: email,
        name: email,
        roleName: `cc_${(index + 1)}`
      };
    });
    return carbonCopies;
  }

  buildProductionDirectorTemplateRole({productionDirector}) {
    return {
      email: productionDirector.email,
      name: productionDirector.personalInformation.full_name,
      roleName: 'Gpac Production Director'
    };
  }

  async buildHiringAuthorityTemplateRole({hiringAuthority, feeAgreement, company}) {
    return {
      email: hiringAuthority.work_email,
      name: hiringAuthority.full_name,
      roleName: 'Hiring Authority',
      tabs: await this.buildTabs({feeAgreement, hiringAuthority, company})
    };
  }

  async buildTabs({feeAgreement, hiringAuthority, company}) {
    const productionDirector = (await feeAgreement.productionDirector().with('personalInformation').fetch()).toJSON();
    const tabsAsObject = this.formatCustomFields({feeAgreement, hiringAuthority, productionDirector, company});
    return {
      textTabs: Object.keys(tabsAsObject).map(key => ({
        tabLabel: key,
        value: tabsAsObject[key]
      }))
    }
  }


  async sendReminder(feeAgreement) {
    const reminderSentResult = await DocuSign.resendEnvelope(feeAgreement.contract_id);
    return reminderSentResult;
  }

  async voidContract(feeAgreement, voidReason) {
    return await DocuSign.voidEnvelope(feeAgreement.contract_id, voidReason);
  }

  async getSignatureEmailBySignerRole(feeAgreement, signerRole) {
    const currentEnvelope = await DocuSign.getEnvelope(feeAgreement.contract_id, 'recipients');
    if (!currentEnvelope) return false;
    const searchedSignerRole = currentEnvelope.recipients.signers.filter(signer => signer.roleName === signerRole)[0] || null;
    return searchedSignerRole?.email;
  }


  async updateHiringAuthoritySignerEmail(feeAgreement, newEmail) {
    const currentEnvelope = await DocuSign.getEnvelope(feeAgreement.contract_id, 'recipients');
    if (!currentEnvelope) return false;
    const recipients = JSON.parse(JSON.stringify(currentEnvelope.recipients));
    for(const signer of recipients.signers) {
      if (signer.roleName == 'Hiring Authority') {
        signer.email = newEmail;
      }
    }
    return await DocuSign.updateRecipients(feeAgreement.contract_id, recipients);
  }

  async getCorrespondingTemplateId(feeAgreementData) {
    if (feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Flat) {
      if (feeAgreementData.guarantee_days) {
        return this.docuSignConfiguration.templates_per_payment_scheme.flat_with_guarantee;
      } else {
        return this.docuSignConfiguration.templates_per_payment_scheme.flat_without_guarantee
      }
    } else if (
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Standard || 
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Conversion||
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.BaseSalary) {
      return this.docuSignConfiguration.templates_per_payment_scheme[feeAgreementData.fee_agreement_payment_scheme_id];
    }
    return this.docuSignConfiguration.templates_per_payment_scheme[FeeAgreementPaymentSchemes.Standard];
  }

  async getFilesInBase64(feeAgreement) {
    return await DocuSign.getCombinedDocumentsInBase64(feeAgreement.contract_id);
  }

  async checkIfContractExists(feeAgreement) {
    try {
      const currentEnvelope = await DocuSign.getEnvelope(feeAgreement.contract_id, 'recipients');
      return !!currentEnvelope;
    } catch(error) {
      if (error.response && error.response.status === 404) return false;
      throw error;
    }

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
}

module.exports = DocuSignFeeAgreementContractManager;
