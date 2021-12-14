'use strict'
const DocuSign = use('Services/DocuSign');
const DocusignEvent = use('App/Models/DocusignEvent');
const DocusignFeeAgreementEventProcessor = use('App/Helpers/DocusignFeeAgreementEventProcessor');
const appInsights = require('applicationinsights');
class DocuSignController {
  constructor() {
    this.docusignFeeAgreementEventProcessor = new DocusignFeeAgreementEventProcessor();
  }
  async handleDocuSignEvent({request, response}) {
    try {
      const docuSignSignatures = [request.header('X-DocuSign-Signature-1'), request.header('X-DocuSign-Signature-2')];
      const envelope = request.all();
      const rawPayload = request.raw();
      const {matches, signature} = await DocuSign.verifyDocuSignWebhookRequest(rawPayload, docuSignSignatures);
      if (!matches) return response.status(401).send({message: 'Invalid request'});
      await this._storeDocusignEvent({id:signature, data: envelope});
      await this.docusignFeeAgreementEventProcessor.processDocuSignWebhookEvent(envelope);
      return response.status(200).send(envelope);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      response.status(500).send(error);
    }
  }

  async _storeDocusignEvent(event) {
    const {id} = event;
    const existentEvent = await DocusignEvent.find(id);
    if (existentEvent) {
      return existentEvent;
    }
    await DocusignEvent.create(event);
  }


  
}

module.exports = DocuSignController
