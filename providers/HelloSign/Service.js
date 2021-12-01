'use strict';
const hellosign = require('hellosign-sdk');
const crypto = require('crypto');
class HelloSignService {
  constructor(config) {
    this.clientId = config.get('helloSign.clientId');
    this.apiKey = config.get('helloSign.apiKey');
    this.testMode = this.parseTestMode(config.get('helloSign.testMode'));
    this.hellosign = hellosign({key: this.apiKey});
  }

  parseTestMode(input) {
    const testModeMap = {
      true: 1,
      false: 0
    };
    if (input != 'true' && input != 'false') {
      return 1;
    }
    return testModeMap[input];
  }

  async listTemplates(page, pageSize) {
    const response = await this.hellosign.template.list({page, page_size: pageSize});
    return {list: response.list_info, templates: response.templates};
  }

  async getTemplateDetails(templateId) {
    return await this.hellosign.template.get(templateId);
  }

  async getTemplateFile(templateId) {
    const hellosign = this.hellosign;
    return new Promise((resolve, reject) => {
      hellosign.template.files(templateId, (err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      })
    });
  }

  async createSignatureRequest(payload) {
    const response = await this.hellosign.signatureRequest.sendWithTemplate({...payload, test_mode: this.testMode, clientId: this.clientId});
    return response;
  }

  async createSignatureRequestFromUnClaimedDraft(payload) {
    const response = await this.hellosign.unclaimedDraft.createEmbeddedWithTemplate({...payload, test_mode: this.testMode, clientId: this.clientId});
    return response;
  }

  getFiles(signatureRequestId, options) {
    const hellosign = this.hellosign;
    return new Promise(function executor(resolve, reject) {
      hellosign.signatureRequest.download(signatureRequestId, options, (err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      })
    });
  }

  getFilesInBase64(signatureRequestId, options) {
    const self = this;
    return new Promise(function executor(resolve, reject) {
      self.getFiles(signatureRequestId, options).then(function toBase64(stream) {
        const chunks = [];
        stream.on('data', function(chunk) {
          chunks.push(chunk);
        });
        stream.on('end', function () {
          resolve(Buffer.concat(chunks).toString('base64'));
        });
      }, reject);
    });
  }

  async createSignatureRequestPreviewWithTemplate(payload) {

    const response = await this.hellosign.unclaimedDraft.createEmbeddedWithTemplate({...payload, test_mode: this.testMode, clientId: this.clientId});
    return response;
  }

  async sendReminder(payload) {
    const  { signatureRequestId, email } = payload;
    const response = await this.hellosign.signatureRequest.remind(signatureRequestId, {email_address: email});
    return response;
  }

  async createEmbeddedTemplateDraft(payload) {
    const finalPayload = { ...payload, test_mode: this.testMode, clientId: this.clientId};
    const response = await this.hellosign.template.createEmbeddedDraft(finalPayload);
    return response;
  }

  async cancelSignatureRequest(signatureRequestId) {
    try {
      this.hellosign.signatureRequest.cancel(signatureRequestId);
      return true;
    } catch(error) {
      return false;
    }
  }

  async getSignatureRequest(signatureRequestId) {
    try {
      const response = await this.hellosign.signatureRequest.get(signatureRequestId);
      return response;
    } catch(error) {
      return null;
    }
  }

  async verifyEvent(event) {
    const hash = crypto.createHmac('sha256', this.apiKey)
      .update(event.event_time + event.event_type)
      .digest('hex')
      .toString();
    return hash === event.event_hash;
  }

  async updateEmails(signatureRequestId, signatureId, email) {
    
      const response = await this.hellosign.signatureRequest.update(signatureRequestId, {
        signature_id: signatureId,
        email_address: email,
      });
      return response.data;    
  }

}

module.exports = HelloSignService;