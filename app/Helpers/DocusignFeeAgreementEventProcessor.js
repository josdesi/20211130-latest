const Env = use('Env');
const DocuSign = use('Services/DocuSign');
const DocusignAuditEvent = use('App/Models/DocusignAuditEvent');
const FeeAgreementEventLog = use('App/Models/FeeAgreementEventLog');
const { uploadFile } = use('App/Helpers/FileHelper');
const TimeoffHelper = use('App/Helpers/TimeoffHelper');
const Database = use('Database');
const Event = use('Event');
const EventType = use('App/Helpers/Events');

const appInsights = require('applicationinsights');
const { DocusignAuditEventActions, FeeAgreementStatus, FeeAgreementEventType, FeeAgreementSignerRole} = use('App/Helpers/Globals');
const CompanyFeeAgreement = use('App/Models/CompanyFeeAgreement');
const FeeAgreementStatusCalculator = use('App/Helpers/FeeAgreementStatusCalculator');
const SignerStatus = {
  Completed: 'completed'
};
class DocusignFeeAgreementEventProcessor {
  constructor() {
    this.feeAgreementStatusCalculator = new FeeAgreementStatusCalculator();
    this.expectedFeeAgreementEventsPerStatus = {
      [FeeAgreementStatus.PendingHiringAuthoritySignature]: [
        this.scanForOpenedByHiringAuthority.bind(this),
        this.scanForViewedByHiringAuthority.bind(this),
        this.scanForSignedByHiringAuthority.bind(this),
      ],
      [FeeAgreementStatus.PendingProductionDirectorSignature]: [ 
        this.scanForOpenedByProductionDirector.bind(this),
        this.scanForViewedByProductionDirector.bind(this),
        this.scanForSignedByProductionDirector.bind(this),
      ]
    };

    this.webhookPayloadEventScanners = {
      [FeeAgreementStatus.PendingHiringAuthoritySignature]: [
        this.scanWebHookPayloadForSignedByHiringAuthority.bind(this),
        this.scanWebHookPayloadForSignedByProductionDirector.bind(this),
      ],
      [FeeAgreementStatus.PendingProductionDirectorSignature]: [
        this.scanWebHookPayloadForSignedByProductionDirector.bind(this),
      ]
    };

    this.standaloneAuditEventsToScanFor = [];
    this.timeOffHelper = new TimeoffHelper({
      cutoffTime: Env.get('BOARDS_CUTOFF_TIME') || '20:00',
      timezone: Env.get('BOARDS_TIMEZONE') || 'US/Central'
    });
  }

  getSpecificSigner(currentEnvelope, signerRole) {
    if ((!currentEnvelope || !currentEnvelope.recipients || !currentEnvelope.recipients.signers)) {
      throw new Error('currentEnvelope is not valid');
    }
    const hiringAuthoritySigner = currentEnvelope.recipients.signers.filter(signer => signer.roleName === signerRole)[0] || null;
    if (!hiringAuthoritySigner) throw new Error('Hiring authority signer is not present in envelope');
    return hiringAuthoritySigner;
  }

  async processDocuSignWebhookEvent(envelope) {
    try {
      const { envelopeId } = envelope;
      const feeAgreement = await CompanyFeeAgreement.query().where('contract_id', envelopeId).first();
      if (!feeAgreement) {
        throw new Error(`There is no a fee agreement associated with the envelope Id ${envelopeId}}`);
      }
      const currentEventScanners = this.webhookPayloadEventScanners[feeAgreement.fee_agreement_status_id];
      for(const scanner of currentEventScanners) {
        await scanner({envelope, feeAgreement});
      }
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async refreshAuditEvents({feeAgreement, envelope, throwError = true}) {
    
    try {
      const rawAuditEvents = await DocuSign.listAuditEvents(feeAgreement.contract_id);
      const currentEnvelope = envelope || (await DocuSign.getEnvelope(feeAgreement.contract_id, 'recipients'));
      if (!rawAuditEvents) return [];
      const formatedAuditEvents = rawAuditEvents.map(rawEvent => DocuSign.formatAuditEvent(rawEvent));
      const processedAuditEvents = await this.getRegisteredEventsMap(feeAgreement.contract_id);
      const formatedAuditEventsToScan = await (await Promise.all(formatedAuditEvents.filter(({id}) => !processedAuditEvents[id]).map(async (event) => this.saveAuditEvent({feeAgreement, formattedAuditEvent: event})))).filter(event => !!event);

      await this.scanForEvents({feeAgreement, formatedAuditEventsToScan, currentEnvelope})
    } catch(error) {
      throw error;
    }
  }

  async scanForEvents({feeAgreement, formatedAuditEventsToScan, currentEnvelope}) {
    const originalFeeAgreementStatus = feeAgreement.fee_agreement_status_id;
    const expectedEventsInThisState = this.expectedFeeAgreementEventsPerStatus[originalFeeAgreementStatus] || [];
    const feeAgreementEventsToScanFor = [
      ...expectedEventsInThisState,
      ...this.standaloneAuditEventsToScanFor
    ];
    await Promise.all(feeAgreementEventsToScanFor.map(scanner => scanner({feeAgreement, currentEnvelope, formatedAuditEventsToScan})));
    if (feeAgreement.fee_agreement_status_id != originalFeeAgreementStatus) {
      await this.scanForEvents({feeAgreement, formatedAuditEventsToScan, currentEnvelope});
    }
  }



  async getRegisteredEventsMap(envelopeId) {
    const processedEvents = await Database.table('docusign_audit_events').where('envelope_id', envelopeId).select('id'); 
    const processedEventsMap = {};
    processedEvents.forEach(({id}) => { processedEventsMap[id] = true });
    return processedEventsMap;
  }

  async scanForSignedByHiringAuthority({feeAgreement, currentEnvelope, formatedAuditEventsToScan}) {
    const transaction = await Database.beginTransaction();

    try {
      const hiringAuthoritySigner = this.getSpecificSigner(currentEnvelope, FeeAgreementSignerRole.HiringAuthority);
      const eventsThatMatch = formatedAuditEventsToScan
        .filter(({data}) => data.UserId === hiringAuthoritySigner.userId && data.Action === DocusignAuditEventActions.Signed);
      if (eventsThatMatch.length === 0) {
        transaction.rollback();
        return;
      }
      const eventDate = eventsThatMatch[0].real_date;
      const currentEventId = FeeAgreementEventType.SignedByHiringAuthority;
      feeAgreement.hiring_authority_sign_date = eventDate;
      feeAgreement.fee_agreement_status_id = await this.feeAgreementStatusCalculator.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      feeAgreement.save(transaction);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEventId,

        event_details: eventsThatMatch,
        real_date: eventDate
      };
      for(const eventThatMatch of eventsThatMatch) {
        eventThatMatch.processed = true;
        await eventThatMatch.save(transaction);
      }
      await this.updatePDFURL(feeAgreement, transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
      Event.fire(EventType.CompanyFeeAgreement.SignedByHiringAuthority, {feeAgreement});
    } catch(error) {
      await transaction.rollback();
    }
  }

  async scanForViewedByHiringAuthority({feeAgreement, currentEnvelope, formatedAuditEventsToScan}) {
    const transaction = await Database.beginTransaction();
    try {
      const hiringAuthoritySigner = this.getSpecificSigner(currentEnvelope, FeeAgreementSignerRole.HiringAuthority);
      const eventsThatMatch = formatedAuditEventsToScan
        .filter(({data}) => data.UserId === hiringAuthoritySigner.userId && data.Action === DocusignAuditEventActions.Viewed);
      if (eventsThatMatch.length === 0) {
        transaction.rollback();
        return;
      }
      const currentEventId = FeeAgreementEventType.SignatureRequestViewedByHiringAuthority;
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEventId,

        event_details: eventsThatMatch,
        real_date: eventsThatMatch[0].real_date
      };
      for(const eventThatMatch of eventsThatMatch) {
        eventThatMatch.processed = true;
        await eventThatMatch.save(transaction);
      }
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
    }
  }


  async scanForOpenedByHiringAuthority({feeAgreement, currentEnvelope, formatedAuditEventsToScan}) {
    const transaction = await Database.beginTransaction();
    try {
      const hiringAuthoritySigner = this.getSpecificSigner(currentEnvelope, FeeAgreementSignerRole.HiringAuthority);
      const eventsThatMatch = formatedAuditEventsToScan
        .filter(({data}) => data.UserId === hiringAuthoritySigner.userId && data.Action === DocusignAuditEventActions.Opened);
      if (eventsThatMatch.length === 0) {
        transaction.rollback();
        return;
      }
      const currentEventId = FeeAgreementEventType.SignatureRequestOpenedByHiringAuthority;
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEventId,

        event_details: eventsThatMatch,
        real_date: eventsThatMatch[0].real_date
      };
      for(const eventThatMatch of eventsThatMatch) {
        eventThatMatch.processed = true;
        await eventThatMatch.save(transaction);
      }
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
    }
  }









  async scanForSignedByProductionDirector({feeAgreement, currentEnvelope, formatedAuditEventsToScan}) {
    const transaction = await Database.beginTransaction();

    try {
      const productionDirectorSigner = this.getSpecificSigner(currentEnvelope, FeeAgreementSignerRole.ProductionDirector);
      const eventsThatMatch = formatedAuditEventsToScan
        .filter(({data}) => data.UserId === productionDirectorSigner.userId && data.Action === DocusignAuditEventActions.Signed);
      if (eventsThatMatch.length === 0) {
        transaction.rollback();
        return;
      }
      const currentEventId = FeeAgreementEventType.SignedByProductionDirector;
      const eventDate = eventsThatMatch[0].real_date;
      feeAgreement.production_director_signed_date = eventDate;
      feeAgreement.tracking_signed_date = await this.timeOffHelper.getBoardDate(eventDate);
      feeAgreement.signed_date = eventDate;
      feeAgreement.fee_agreement_status_id = await this.feeAgreementStatusCalculator.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      feeAgreement.save(transaction);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEventId,

        event_details: eventsThatMatch,
        real_date: eventDate
      };
      for(const eventThatMatch of eventsThatMatch) {
        eventThatMatch.processed = true;
        await eventThatMatch.save(transaction);
      }
      await this.updatePDFURL(feeAgreement, transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      Event.fire(EventType.Company.FeeAgreementSigned, {
        companyId: feeAgreement.company_id,
        feeAgreementId: feeAgreement.id
      });
      await transaction.commit();
      Event.fire(EventType.CompanyFeeAgreement.SignedByProductionDirector, {feeAgreement});
    } catch(error) {
      await transaction.rollback();
    }
  }

  async scanForViewedByProductionDirector({feeAgreement, currentEnvelope, formatedAuditEventsToScan}) {
    const transaction = await Database.beginTransaction();
    try {
      const productionDirectorSigner = this.getHiringAuthoritySigner(currentEnvelope);
      const eventsThatMatch = formatedAuditEventsToScan
        .filter(({data}) => data.UserId === productionDirectorSigner.userId && data.Action === DocusignAuditEventActions.Viewed);
      if (eventsThatMatch.length === 0) {
        transaction.rollback();
        return;
      }
      const currentEventId = FeeAgreementEventType.SignatureRequestViewedByProductionDirector;
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEventId,

        event_details: eventsThatMatch,
        real_date: eventsThatMatch[0].real_date
      };
      for(const eventThatMatch of eventsThatMatch) {
        eventThatMatch.processed = true;
        await eventThatMatch.save(transaction);
      }
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
    }
  }


  async scanForOpenedByProductionDirector({feeAgreement, currentEnvelope, formatedAuditEventsToScan}) {
    const transaction = await Database.beginTransaction();
    try {
      const productionDirectorSigner = this.getHiringAuthoritySigner(currentEnvelope);
      const eventsThatMatch = formatedAuditEventsToScan
        .filter(({data}) => data.UserId === productionDirectorSigner.userId && data.Action === DocusignAuditEventActions.Opened);
      if (eventsThatMatch.length === 0) {
        transaction.rollback();
        return;
      }
      const currentEventId = FeeAgreementEventType.SignatureRequestOpenedByProductionDirector;
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEventId,

        event_details: eventsThatMatch,
        real_date: eventsThatMatch[0].real_date
      };
      for(const eventThatMatch of eventsThatMatch) {
        eventThatMatch.processed = true;
        await eventThatMatch.save(transaction);
      }
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
    }
  }












  async saveAuditEvent({ feeAgreement, formattedAuditEvent}) {
    try {
      const auditEvent = {
        id: formattedAuditEvent.id,
        action: formattedAuditEvent.Action,
        fee_agreement_id: feeAgreement.id,
        envelope_id:  feeAgreement.contract_id,
        data: formattedAuditEvent,
        real_date: new Date(formattedAuditEvent.logTime),
        processed: false
      };
  
      return await DocusignAuditEvent.create(auditEvent);
    } catch(error) {
      return null;
    }

  }

  async updatePDFURL(feeAgreement, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic  = transaction && !externalTransaction;
    try {
      const path = `fee_agreements/fee_agreement_${feeAgreement.id}.pdf`;
      const fileStream = await DocuSign.getCombinedDocuments(feeAgreement.contract_id);
      feeAgreement.pdf_url = await uploadFile(path, fileStream);
      await feeAgreement.save(transaction);
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }


  async updatePDFURLWithBase64(feeAgreement, base64Bytes, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic  = transaction && !externalTransaction;
    
    try {
      const path = `fee_agreements/fee_agreement_${feeAgreement.id}.pdf`;
      const buffer = Buffer.from(base64Bytes, 'base64');
      feeAgreement.pdf_url = await uploadFile(path, buffer);
      await feeAgreement.save(transaction);
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  extractCertificate(envelope) {
    return envelope.envelopeDocuments.filter(({documentId}) => documentId === 'certificate')[0];
  }

  extractContract(envelope) {
    return envelope.envelopeDocuments.filter(({documentId}) => documentId === '1')[0];
  }

  extractDocuments(envelope) {
    return envelope.envelopeDocuments;
  }

  async scanWebHookPayloadForSignedByHiringAuthority({envelope, feeAgreement}) {
    let transaction;
    try {
      const currentEventId = FeeAgreementEventType.SignedByHiringAuthority;
      const alreadyRegisteredEvent = await FeeAgreementEventLog.query().where('fee_agreement_id', feeAgreement.id).where('event_type_id', currentEventId).first();
      if (alreadyRegisteredEvent) {
        return;
      }
      const hiringAuthoritySigner = this.getSpecificSigner(envelope, FeeAgreementSignerRole.HiringAuthority);
      if (hiringAuthoritySigner.status != SignerStatus.Completed) {
        return;
      }
      transaction = await Database.beginTransaction()
      const eventDate = new Date(hiringAuthoritySigner.signedDateTime);
      feeAgreement.hiring_authority_sign_date = eventDate;
      feeAgreement.fee_agreement_status_id = await this.feeAgreementStatusCalculator.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      feeAgreement.save(transaction);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEventId,

        event_details: envelope,
        real_date: eventDate
      };

      const contract = this.extractContract(envelope);
      await this.updatePDFURLWithBase64(feeAgreement, contract.PDFBytes, transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
    } catch(error) {
      transaction && (await transaction.rollback());
      throw error;
    }
  }


  async scanWebHookPayloadForSignedByProductionDirector({envelope, feeAgreement}) {
    let transaction;
    try {
      const currentEventId = FeeAgreementEventType.SignedByProductionDirector;
      const alreadyRegisteredEvent = await FeeAgreementEventLog.query().where('fee_agreement_id', feeAgreement.id).where('event_type_id', currentEventId).first();
      if (alreadyRegisteredEvent) {
        return;
      }
      const productionDirectorSigner = this.getSpecificSigner(envelope, FeeAgreementSignerRole.ProductionDirector);
      if (productionDirectorSigner.status != SignerStatus.Completed) {
        return;
      }
      transaction = await Database.beginTransaction();
      const eventDate = new Date(productionDirectorSigner.signedDateTime);
      feeAgreement.production_director_signed_date = eventDate;
      feeAgreement.tracking_signed_date = await this.timeOffHelper.getBoardDate(eventDate);
      feeAgreement.signed_date = eventDate;
      feeAgreement.fee_agreement_status_id = await this.feeAgreementStatusCalculator.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      feeAgreement.save(transaction);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEventId,

        event_details: envelope,
        real_date: eventDate
      };
      const contract = this.extractContract(envelope);
      await this.updatePDFURLWithBase64(feeAgreement, contract.PDFBytes, transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
      Event.fire(EventType.CompanyFeeAgreement.SignedByProductionDirector, {feeAgreement});
      Event.fire(EventType.Company.FeeAgreementSigned, {
        companyId: feeAgreement.company_id,
        feeAgreementId: feeAgreement.id
      });
    } catch(error) {
      transaction && (await transaction.rollback());
      throw error;
    }
  }
}


module.exports = DocusignFeeAgreementEventProcessor;