'use strict';
const appInsights = require("applicationinsights");
const axios = require('axios').default;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const DEFAULT_AUTH_ATTEMPTS = 2;
class DocusignService {
  constructor(config) {
    this.privateKey = config.get('docusign.privateKey');
    this.integrationKey = config.get('docusign.integrationKey');
    this.apiUserId = config.get('docusign.apiUserId');
    this.apiBaseUrl = config.get('docusign.apiBaseUrl');
    this.accountId = config.get('docusign.accountId');
    this.oauthUrl = config.get('docusign.oauthUrl');
    this.webHookKey = config.get('docusign.webHookKey');
    this.adminDomain = config.get('docusign.adminDomain');
  }

  async _renewAccessToken() {
    const { access_token } = await this.getAccessToken();
    this.accessToken = access_token;
  }

  async sendEnvelope(payload) {
    return await this._retryWhenUnAuthenticated(async () => {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
      const url = `${this.apiBaseUrl}/v2.1/accounts/${this.accountId}/envelopes`;
      const response = await axios.post(url, payload, {headers});
      return response.data;
    })
  }

  async listAuditEvents(envelopeId) {
    return await this._retryWhenUnAuthenticated((async () => {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
      const url = `${this.apiBaseUrl}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/audit_events`;
      const response = await axios.get(url, {headers});

      return response.data.auditEvents;
    }));
  }

  async getCombinedDocuments(envelopeId) {
    return await this._retryWhenUnAuthenticated((async () => {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
      const url = `${this.apiBaseUrl}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/documents/combined`;
      const response = await axios.get(url, {headers, responseType: 'stream'});

      return response.data;
    }));
  }

  async getCombinedDocumentsInBase64(envelopeId) {
    const _streamToBase64 = (stream) => {
      return new Promise(function executor(resolve, reject) {
        const chunks = [];
        stream.on('data', function(chunk) {
          chunks.push(chunk);
        });
        stream.on('end', function () {
          resolve(Buffer.concat(chunks).toString('base64'));
        });
        stream.on('error', (error) => reject(error));
      });
    }
    return await this._retryWhenUnAuthenticated((async () => {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
      const url = `${this.apiBaseUrl}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/documents/combined`;
      const response = await axios.get(url, {headers, responseType: 'stream'});
      const stream = response.data;

      return await _streamToBase64(stream);
      
    }));
  }



  async getEnvelope(envelopeId, include) {
    return await this._retryWhenUnAuthenticated((async () => {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
      const url = `${this.apiBaseUrl}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}`;
      const response = await axios.get(url, {headers, params: {include}});

      return response.data;
    }));
  }

  async resendEnvelope(envelopeId) {
    return await this._retryWhenUnAuthenticated((async () => {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
      const url = `${this.apiBaseUrl}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}?resend_envelope=true`;
      const response = await axios.put(url, {}, {headers});

      return response.data;
    }));
  }

  async voidEnvelope(envelopeId, voidedReason = 'Not specified') {
    return await this._retryWhenUnAuthenticated((async () => {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
      const url = `${this.apiBaseUrl}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}?resend_envelope=true`;
      const response = await axios.put(url, {status: 'voided', voidedReason}, {headers});

      return response.data;
    }));
  }

  async updateRecipients(envelopeId, recipients) {
    return await this._retryWhenUnAuthenticated((async () => {
      const headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
      const url = `${this.apiBaseUrl}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/recipients?resend_envelope=true`;
      const response = await axios.put(url, recipients, {headers});

      return response.data;
    }));
  }

  formatAuditEvent(auditEvent) {
    const objectResult = {};
    auditEvent.eventFields.forEach(({name, value}) => {
      objectResult[name] = value;
    });

    objectResult.id = this.getAuditEventIdentifier(objectResult);
    return objectResult;
  }

  getAuditEventIdentifier(formattedAuditEvent) {
    const uniqueEventIdentifierBody = {
      logTime: formattedAuditEvent.logTime || null,
      UserId: formattedAuditEvent.UserId || null,
      Action: formattedAuditEvent.Action || null,
      ClientIPAddress: formattedAuditEvent.ClientIPAddress || null
    };
    return Buffer.from(JSON.stringify(uniqueEventIdentifierBody)).toString('base64');
  }

  

  async getAccessToken() {
    const payload = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await this.getJWT()
    };
    const url = `${this.oauthUrl}`;
    const response = await axios.post(url, payload);
    return response.data;
  }

  async _retryWhenUnAuthenticated(action) {
    if (!this.accessToken) this._renewAccessToken();
    for (let i = 0; i < DEFAULT_AUTH_ATTEMPTS; i++) {
      try {
        return await action();
      } catch(error) {
        if (error.response && (error.response.status == 401)) {
          await this._renewAccessToken();
        } else {
          appInsights.defaultClient.trackException({exception: error});
          throw error;
        }
      } 
    }
  }

  async  getJWT() {
    const iat = (new Date()).getTime() / 1000;
    const exp = iat + 500 * 60 * 60;
    const body = {
        iss: this.integrationKey,
        sub: this.apiUserId,
        iat: iat,
        exp: exp,
        aud: this.adminDomain,
        scope: 'signature'
      };
    const signed = jwt.sign(body, this.privateKey, { algorithm: 'RS256'});
    return signed;
  }

  computeHash (secret, payload) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.write(payload);
    hmac.end();
    return hmac.read().toString('base64');
  };
  
  hashIsValid(hash, verify) {
    return crypto.timingSafeEqual(Buffer.from(verify, 'base64'), Buffer.from(hash, 'base64'));
  };

  async verifyDocuSignWebhookRequest(payload, signatures) {
    const binaryPayload = Buffer.from(payload, 'utf-8');
    const hashedPayload =  this.computeHash(this.webHookKey, binaryPayload);
    const verifications =  signatures.filter(signature => !!signature).map(signature => ({ signature: signature, matches: this.hashIsValid(hashedPayload, signature)}));
    return verifications.filter(({matches}) => matches)[0] || {} ;
  }

  computeHashForExternalPayload(payload) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.webHookKey);
    hmac.write(payload);
    hmac.end();
    return hmac.read().toString('base64');
  }
  
}

module.exports = DocusignService;