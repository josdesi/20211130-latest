'use strict';

const HelloSignFeeAgreementContractManager = use('App/Helpers/HelloSignFeeAgreementContractManager');
const DocuSignFeeAgreementSignContractManager = use('App/Helpers/DocuSignFeeAgreementContractManager');
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const { SignatureProvider } = use('App/Helpers/Globals');

class FeeAgreementContractManager {
  constructor({feeAgreementConfiguration, docuSignConfiguration, helloSignContractManager, docuSignContractManager}) {
    this.feeAgreementConfiguration = feeAgreementConfiguration;
    this.docuSignConfiguration = docuSignConfiguration;
    this.helloSignContractManager = helloSignContractManager;
    this.docuSignContractManager = docuSignContractManager

    this.sendingAlternatives = [
      {providerId: SignatureProvider.HelloSign, manager: this.helloSignContractManager},
      {providerId: SignatureProvider.DocuSign, manager: this.docuSignContractManager}
    ];

    this.contractManagersMap = {
      [SignatureProvider.DocuSign]: this.docuSignContractManager,
      [SignatureProvider.HelloSign]: this.helloSignContractManager,
    };
  }

  static async buildDefault() {
    const feeAgreementConfiguration = await ModulePresetsConfigRepository.getById('feeAgreement');
    const docuSignConfiguration = await ModulePresetsConfigRepository.getById('docuSign');
    const helloSignContractManager = new HelloSignFeeAgreementContractManager(feeAgreementConfiguration.data, docuSignConfiguration.data);
    const docuSignContractManager = new DocuSignFeeAgreementSignContractManager(feeAgreementConfiguration.data, docuSignConfiguration.data);
    return new FeeAgreementContractManager({
      feeAgreementConfiguration,
      docuSignConfiguration,
      helloSignContractManager,
      docuSignContractManager
    });
  }

  async sendFeeAgreement({feeAgreement, userId}) {
    const company = await feeAgreement.company().fetch();
    const hiringAuthority = await feeAgreement.hiringAuthority().fetch();
    const productionDirector =  (await feeAgreement.productionDirector().with('personalInformation').fetch()).toJSON();
    const failedAttempts = [];
    for(const alternative of this.sendingAlternatives) {
      try {
        const contractSentDetails = await alternative.manager.sendContract({feeAgreement, company, hiringAuthority, productionDirector, userId});
        return {providerId: alternative.providerId, contractSentDetails};
      } catch(error) {
        failedAttempts.push(error);
      }
    }
    throw {message: 'All alternatives failed to send fee agreement', exceptions: failedAttempts};
  }

  async getManagerForSignatureProvider(providerId) {
    const manager = this.contractManagersMap[providerId];
    if (!manager) {
      throw new Error('No manager found');
    }
    return manager;
  }

  async sendFeeAgreementThroughSpecificProvider({feeAgreement, userId, providerId}) {
    const company = await feeAgreement.company().fetch();
    const hiringAuthority = await feeAgreement.hiringAuthority().fetch();
    const productionDirector =  (await feeAgreement.productionDirector().with('personalInformation').fetch()).toJSON();
    const manager = this.contractManagersMap[providerId];
    if (!manager) throw new Error(`No contract manager found for signature provider ${providerId}`);
    const contractSentDetails = await manager.sendContract({feeAgreement, company, hiringAuthority, productionDirector, userId});
    return {providerId: providerId, contractSentDetails};
  }

  async voidContract(feeAgreement) {
    const manager = this.contractManagersMap[feeAgreement.electronic_signature_provider_id];
    if (!manager) throw new Error(`No contract manager found for signature provider ${feeAgreement.electronic_signature_provider_id}`);
    if (!(manager.voidContract instanceof Function)) throw new Error(`Contract manager does not support 'voidContract' or is implemented under unknow name`);
    return await manager.voidContract(feeAgreement);
  }

  async sendReminder(feeAgreement) {
    const manager = this.contractManagersMap[feeAgreement.electronic_signature_provider_id];
    if (!manager) throw new Error(`No contract manager found for signature provider '${feeAgreement.electronic_signature_provider_id}'`);
    if (!(manager.sendReminder instanceof Function)) throw new Error(`Contract for signature provider '${feeAgreement.electronic_signature_provider_id}' manager does not support 'sendReminder' or is implemented under unknow name`);
    return await manager.sendReminder(feeAgreement);
  }

  async getSignatureEmailBySignerRole(feeAgreement, signerRole) {
    const manager = this.contractManagersMap[feeAgreement.electronic_signature_provider_id];
    if (!manager) throw new Error(`No contract manager found for signature provider '${feeAgreement.electronic_signature_provider_id}'`);
    if (!(manager.getSignatureEmailBySignerRole instanceof Function)) throw new Error(`Contract for signature provider '${feeAgreement.electronic_signature_provider_id}' manager does not support 'getSignatureEmailBySignerRole' or is implemented under unknow name`);
    return await manager.getSignatureEmailBySignerRole(feeAgreement, signerRole);
  }

  async updateHiringAuthoritySignerEmail(feeAgreement, newEmail) {
    const manager = this.contractManagersMap[feeAgreement.electronic_signature_provider_id];
    if (!manager) throw new Error(`No contract manager found for signature provider '${feeAgreement.electronic_signature_provider_id}'`);
    if (!(manager.getSignatureEmailBySignerRole instanceof Function)) throw new Error(`Contract for signature provider '${feeAgreement.electronic_signature_provider_id}' manager does not support 'updateHiringAuthoritySignerEmail' or is implemented under unknow name`);
    return await manager.updateHiringAuthoritySignerEmail(feeAgreement, newEmail);
  }

  async getFilesInBase64(feeAgreement) {
    const manager = this.contractManagersMap[feeAgreement.electronic_signature_provider_id];
    if (!manager) throw new Error(`No contract manager found for signature provider '${feeAgreement.electronic_signature_provider_id}'`);
    if (!(manager.getFilesInBase64 instanceof Function)) throw new Error(`Contract for signature provider '${feeAgreement.electronic_signature_provider_id}' manager does not support 'getFilesInBase64' or is implemented under unknow name`);
    return await manager.getFilesInBase64(feeAgreement);
  }

  async checkIfContractExists(feeAgreement) {
    const manager = this.contractManagersMap[feeAgreement.electronic_signature_provider_id];
    if (!manager) throw new Error(`No contract manager found for signature provider '${feeAgreement.electronic_signature_provider_id}'`);
    if (!(manager.checkIfContractExists instanceof Function)) throw new Error(`Contract for signature provider '${feeAgreement.electronic_signature_provider_id}' manager does not support 'checkIfContractExists' or is implemented under unknow name`);
    return await manager.checkIfContractExists(feeAgreement);
  }
}

module.exports = FeeAgreementContractManager;
