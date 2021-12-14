
const { FeeAgreementSignatureProcessType, FeeAgreementPaymentSchemes, FeeAgreementStatus, FeeAgreementEventType, userRoles } = use('App/Helpers/Globals');
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();

class FeeAgreementStatusCalculator {
  async calculateStatus(input_current_status_id, input_event_type_id, context) {
    const current_status_id = Number(input_current_status_id);
    const event_type_id = Number(input_event_type_id);
    let resultStatus;
    switch(current_status_id) {
      case FeeAgreementStatus.PendingCoachValidation:
        resultStatus = await this.calculateStatusFromPendingCoachValidation(event_type_id, context);
        break;
      case FeeAgreementStatus.DeclinedByCoach:
        resultStatus = this.calculateStatusFromDeclinedByCoach(event_type_id, context);
        break;
      case FeeAgreementStatus.PendingOperationsValidation:
        resultStatus = this.calculateStatusFromPendingOperationsValidation(event_type_id, context);
        break;
      case FeeAgreementStatus.DeclinedByOperations:
        resultStatus = this.calculateStatusFromDeclinedByOperations(event_type_id, context);
        break;
      case FeeAgreementStatus.PendingHiringAuthoritySignature:
        resultStatus = this.calculateStatusFromPendingHiringAuthoritySignature(event_type_id, context);
        break;
      case FeeAgreementStatus.PendingProductionDirectorSignature:
        resultStatus = this.calculateStatusFromPendingProductionDirectorSignature(event_type_id, context);
        break;
      case FeeAgreementStatus.Expired:
        resultStatus = this.calculateStatusFromExpired(event_type_id);
        break;
      case FeeAgreementStatus.Signed:
        resultStatus = this.calculateStatusFromSigned(event_type_id, context);
        break;
      default: throw new Error('Invalid status');
    }
    return resultStatus;
  }

  async calculateInitialStatusAndInitialEventForFlat(feeAgreementData, creatorRoleId) {
    const isAppropiatedByOperations = (feeAgreementData.appropiator_role_id == userRoles.Operations);
    const notRequiresCoachValidation = (creatorRoleId == userRoles.Coach || creatorRoleId == userRoles.RegionalDirector || feeAgreementData.appropiator_role_id == userRoles.Coach || feeAgreementData.appropiator_role_id == userRoles.RegionalDirector);
    if (isAppropiatedByOperations) {
      return {
        fee_agreement_status_id: feeAgreementData.verbiage_changes_requested ? FeeAgreementStatus.PendingOperationsValidation : FeeAgreementStatus.PendingHiringAuthoritySignature,
        event_type_id: feeAgreementData.verbiage_changes_requested ? FeeAgreementEventType.CreatedAndSentToOperationsValidation : FeeAgreementEventType.CreatedAndSentToSign,
      };
    }
    return {
      fee_agreement_status_id: notRequiresCoachValidation ? FeeAgreementStatus.PendingOperationsValidation : FeeAgreementStatus.PendingCoachValidation, 
      event_type_id: notRequiresCoachValidation ? FeeAgreementEventType.CreatedAndSentToOperationsValidation : FeeAgreementEventType.CreatedAndSentToCoachValidation,
    };
  }

  async calculateInitialStatusAndInitialEventUnmanaged(feeAgreementData, creatorRoleId) {
    return (creatorRoleId === userRoles.Operations) ? {
      fee_agreement_status_id: (!feeAgreementData.verbiage_changes_requested) ? FeeAgreementStatus.Signed : FeeAgreementStatus.PendingOperationsValidation, 
      event_type_id: FeeAgreementEventType.CreatedUnmanagedByOperations,
    } : {
      fee_agreement_status_id: FeeAgreementStatus.PendingOperationsValidation, 
      event_type_id: FeeAgreementEventType.CreatedUnmanagedAndSentToOperationsValidation,
    };
  }

  async calculateInitialStatusAndInitialEventForConversion(feeAgreementData, creatorRoleId) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const notRequiresCoachValidation = (creatorRoleId == userRoles.Coach || creatorRoleId == userRoles.RegionalDirector || feeAgreementData.appropiator_role_id == userRoles.Coach || feeAgreementData.appropiator_role_id == userRoles.RegionalDirector);
    const feeAgreementDefaults  = config.data.defaultValues;
    const isAppropiatedByOperations = (feeAgreementData.appropiator_role_id == userRoles.Operations);
    const requiresValidation = (!isAppropiatedByOperations && feeAgreementData.fee_percentage_change_requested && Number(feeAgreementData.fee_percentage) < Number(feeAgreementDefaults.fee_percentage))
    || feeAgreementData.guarantee_days_change_requested
    || feeAgreementData.verbiage_changes_requested;
    if (isAppropiatedByOperations) {
      return {
        fee_agreement_status_id: feeAgreementData.verbiage_changes_requested ? FeeAgreementStatus.PendingOperationsValidation : FeeAgreementStatus.PendingHiringAuthoritySignature,
        event_type_id: feeAgreementData.verbiage_changes_requested ? FeeAgreementEventType.CreatedAndSentToOperationsValidation : FeeAgreementEventType.CreatedAndSentToSign,
      };
    }
    if (requiresValidation) {
       return {
         fee_agreement_status_id: notRequiresCoachValidation ? FeeAgreementStatus.PendingOperationsValidation : FeeAgreementStatus.PendingCoachValidation, 
         event_type_id: notRequiresCoachValidation ? FeeAgreementEventType.CreatedAndSentToOperationsValidation : FeeAgreementEventType.CreatedAndSentToCoachValidation,
       };
     }
     return {fee_agreement_status_id: FeeAgreementStatus.PendingHiringAuthoritySignature, event_type_id: FeeAgreementEventType.CreatedAndSentToSign};
  }


  async calculateInitialStatusAndInitialEventForBaseSalary(feeAgreementData, creatorRoleId) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const notRequiresCoachValidation = (creatorRoleId == userRoles.Coach || creatorRoleId == userRoles.RegionalDirector || feeAgreementData.appropiator_role_id == userRoles.Coach || feeAgreementData.appropiator_role_id == userRoles.RegionalDirector);
    const feeAgreementDefaults  = config.data.defaultValues;
    const isAppropiatedByOperations = (feeAgreementData.appropiator_role_id == userRoles.Operations);
    const requiresValidation = (!isAppropiatedByOperations && feeAgreementData.fee_percentage_change_requested && Number(feeAgreementData.fee_percentage) < Number(feeAgreementDefaults.fee_percentage))
    || feeAgreementData.guarantee_days_change_requested
    || feeAgreementData.verbiage_changes_requested;
    if (isAppropiatedByOperations) {
      return {
        fee_agreement_status_id: feeAgreementData.verbiage_changes_requested ? FeeAgreementStatus.PendingOperationsValidation : FeeAgreementStatus.PendingHiringAuthoritySignature,
        event_type_id: feeAgreementData.verbiage_changes_requested ? FeeAgreementEventType.CreatedAndSentToOperationsValidation : FeeAgreementEventType.CreatedAndSentToSign,
      };
    }
    if (requiresValidation) {
       return {
         fee_agreement_status_id: notRequiresCoachValidation ? FeeAgreementStatus.PendingOperationsValidation : FeeAgreementStatus.PendingCoachValidation, 
         event_type_id: notRequiresCoachValidation ? FeeAgreementEventType.CreatedAndSentToOperationsValidation : FeeAgreementEventType.CreatedAndSentToCoachValidation,
       };
     }
     return {
       fee_agreement_status_id: notRequiresCoachValidation ?
        FeeAgreementStatus.PendingHiringAuthoritySignature :
        FeeAgreementStatus.PendingCoachValidation,
        event_type_id: notRequiresCoachValidation ?
        FeeAgreementEventType.CreatedAndSentToSign :
        FeeAgreementEventType.CreatedAndSentToCoachValidation
      };
    }

    async calculateInitialStatusAndInitialEventForStandard(feeAgreementData, creatorRoleId) {
      const config = await ModulePresetsConfigRepository.getById('feeAgreement');
      const feeAgreementDefaults  = config.data.defaultValues;
      const notRequiresCoachValidation = (creatorRoleId == userRoles.Coach || creatorRoleId == userRoles.RegionalDirector) || (feeAgreementData.appropiator_role_id == userRoles.Coach || feeAgreementData.appropiator_role_id == userRoles.RegionalDirector);
      const isAppropiatedByOperations = (feeAgreementData.appropiator_role_id == userRoles.Operations);
      const requiresValidation = (!isAppropiatedByOperations && feeAgreementData.fee_percentage_change_requested && Number(feeAgreementData.fee_percentage) < Number(feeAgreementDefaults.fee_percentage))
        || feeAgreementData.guarantee_days_change_requested 
        || feeAgreementData.verbiage_changes_requested;
      if (isAppropiatedByOperations) {
        return {
          fee_agreement_status_id: feeAgreementData.verbiage_changes_requested ? FeeAgreementStatus.PendingOperationsValidation : FeeAgreementStatus.PendingHiringAuthoritySignature,
          event_type_id: feeAgreementData.verbiage_changes_requested ? FeeAgreementEventType.CreatedAndSentToOperationsValidation : FeeAgreementEventType.CreatedAndSentToSign,
        };
      }
      if (requiresValidation) {
         return {
           fee_agreement_status_id: notRequiresCoachValidation ? FeeAgreementStatus.PendingOperationsValidation : FeeAgreementStatus.PendingCoachValidation, 
           event_type_id: notRequiresCoachValidation ? FeeAgreementEventType.CreatedAndSentToOperationsValidation : FeeAgreementEventType.CreatedAndSentToCoachValidation,
         };
       }
       return {fee_agreement_status_id: FeeAgreementStatus.PendingHiringAuthoritySignature, event_type_id: FeeAgreementEventType.CreatedAndSentToSign};
    }

    async calculateStatusFromPendingCoachValidation(event_type_id, context) {
      const { feeAgreement } = context;
      const config = await ModulePresetsConfigRepository.getById('feeAgreement');
      const feeAgreementDefaults  = config.data.defaultValues;
      const requiresOperationsValidation = (feeAgreement.fee_percentage_change_requested && Number(feeAgreement.fee_percentage) < Number(feeAgreementDefaults.fee_percentage))
      || feeAgreement.guarantee_days_change_requested 
      || feeAgreement.verbiage_changes_requested;
      switch (event_type_id) {
        case FeeAgreementEventType.SignatureRequestPreviewCreated:
          return FeeAgreementStatus.PendingCoachValidation;
        case FeeAgreementEventType.DeclinedByCoach: 
          return FeeAgreementStatus.DeclinedByCoach;
        case FeeAgreementEventType.ValidatedByCoach:
          return (feeAgreement.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.BaseSalary && !requiresOperationsValidation) ? 
            FeeAgreementStatus.PendingHiringAuthoritySignature :
            FeeAgreementStatus.PendingOperationsValidation;
        case FeeAgreementEventType.ValidationRequestCanceled:
          return FeeAgreementStatus.Canceled;
        case FeeAgreementEventType.ValidatedByRegionalDirector:
          return (feeAgreement.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.BaseSalary && !requiresOperationsValidation) ? 
            FeeAgreementStatus.PendingHiringAuthoritySignature :
            FeeAgreementStatus.PendingOperationsValidation;
        case FeeAgreementEventType.ValidatedByOperationsAndSentToSign:
            return FeeAgreementStatus.PendingHiringAuthoritySignature;
        case FeeAgreementEventType.DeclinedByRegionalDirector: 
          return FeeAgreementStatus.DeclinedByCoach;
        case FeeAgreementEventType.DeclinedByOperations: 
          return FeeAgreementStatus.DeclinedByCoach;
        default: throw new Error(`Can't perform event ${event_type_id} with current status`);
      }
    }
  
    calculateStatusFromDeclinedByCoach(event_type_id) {
      switch (event_type_id) {
        case FeeAgreementEventType.SentToCoachValidation: 
          return FeeAgreementStatus.PendingCoachValidation;
        case FeeAgreementEventType.ValidationRequestCanceled:
          return FeeAgreementStatus.Canceled;
        default: throw new Error(`Can't perform event ${event_type_id} with current status`);
      }
    }
  
    calculateStatusFromDeclinedByOperations(event_type_id) {
      switch (event_type_id) {
        case FeeAgreementEventType.SentToOperationsValidation: 
          return FeeAgreementStatus.PendingOperationsValidation;
        case FeeAgreementEventType.ValidationRequestCanceled:
          return FeeAgreementStatus.Canceled;
        default: throw new Error(`Can't perform event ${event_type_id} with current status`);
      }
    }
  
    calculateStatusFromPendingOperationsValidation(event_type_id) {
      switch (event_type_id) {
        case FeeAgreementEventType.ValidatedByOperationsAndSentToSign: 
          return FeeAgreementStatus.PendingHiringAuthoritySignature;
        case FeeAgreementEventType.DeclinedByOperations:
          return FeeAgreementStatus.DeclinedByOperations;
        case FeeAgreementEventType.SignatureRequestPreviewCreated:
          return FeeAgreementStatus.PendingOperationsValidation;
        case FeeAgreementEventType.ValidationRequestCanceled:
          return FeeAgreementStatus.Canceled;
        case FeeAgreementEventType.UnmanagedValidatedByOperations:
          return FeeAgreementStatus.Signed;
        default: throw new Error(`Can't perform event ${event_type_id} with current status`);
      }
    }
  
  
    calculateStatusFromPendingHiringAuthoritySignature(event_type_id) {
      switch (event_type_id) {
        case FeeAgreementEventType.SignedByHiringAuthority: 
          return FeeAgreementStatus.PendingProductionDirectorSignature;
        case FeeAgreementEventType.VoidedByOperations: 
          return FeeAgreementStatus.Void;  
        case FeeAgreementEventType.VoidedByExpiration: 
          return FeeAgreementStatus.Expired;
        default: throw new Error(`Can't perform event ${event_type_id} with current status`);
      }
    }
  
    calculateStatusFromPendingProductionDirectorSignature(event_type_id) {
      switch (event_type_id) {
        case FeeAgreementEventType.SignedByProductionDirector: 
          return FeeAgreementStatus.Signed;
        case FeeAgreementEventType.VoidedByOperations: 
          return FeeAgreementStatus.Void;  
        case FeeAgreementEventType.VoidedByExpiration: 
          return FeeAgreementStatus.Expired;
        default: throw new Error(`Can't perform event ${event_type_id} with current status`);
      }
    }
  
    calculateStatusFromExpired(event_type_id) {
      switch (event_type_id) {
        case FeeAgreementEventType.Restored: 
          return FeeAgreementStatus.PendingHiringAuthoritySignature;
        default: throw new Error(`Can't perform event ${event_type_id} with current status`);
      }
    }

    calculateStatusFromSigned(event_type_id, context) {
      const { feeAgreement } = context;
      if (feeAgreement.signature_process_type_id != FeeAgreementSignatureProcessType.ExternalUnmanaged) {
        throw new Error(`This event is available only for ${FeeAgreementSignatureProcessType.ExternalUnmanaged} signature process type`);
      }
      switch (event_type_id) {
        case FeeAgreementEventType.UpdatedByOperations: 
          return FeeAgreementStatus.Signed;
        default: throw new Error(`Can't perform event ${event_type_id} with current status`);
      }
    }


    async getCurrentResponsible(input_current_status_id, feeAgreement) {
      const current_status_id = Number(input_current_status_id);
      switch(current_status_id) {
        case FeeAgreementStatus.PendingHiringAuthoritySignature :
          return 'Hiring Authority';
        case FeeAgreementStatus.PendingCoachValidation:
          return await this.getFullName(feeAgreement.coach_id);
        case FeeAgreementStatus.PendingOperationsValidation:
          return 'Operations Team';
        case FeeAgreementStatus.DeclinedByCoach:
          return await this.getFullName(feeAgreement.coach_id);
        case FeeAgreementStatus.DeclinedByOperations:
          return await this.getFullName(feeAgreement.creator_id);
        case FeeAgreementStatus.PendingProductionDirectorSignature:
          return await this.getFullName(feeAgreement.production_director_signer_id);
        case FeeAgreementStatus.Signed:
          return  '';
        default: throw new Error('Invalid status');
  
      }
    }

    async getFullName(userId) {
      const details = await UserRepository.getDetails(userId);
      return details.full_name;
    }

}

module.exports = FeeAgreementStatusCalculator;