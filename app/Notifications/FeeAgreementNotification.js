const { notificationCategories } = use('App/Notifications/Constants');

const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const CompanyFeeAgreement = use('App/Models/CompanyFeeAgreement');

const { FeeAgreementTab, FeeAgreementStatus, SignatureProvider} = use('App/Helpers/Globals');
const feeAgreementPositiveIconName = 'feeAgreementPositive';
const feeAgreementNegativeIconName = 'feeAgreementNegative';
const Env = use('Env');
const notificationColor = '#4056F4';
class FeeAgreementNotification {
  constructor() {
    this.publicURLWeb = Env.get('PUBLIC_URL_WEB');
    this.pendingValidationsTab = FeeAgreementTab.PendingValidations;
    this.pendingSignaturesTab = FeeAgreementTab.PendingSignatures;
    this.signedFeeAgreementsTab = FeeAgreementTab.SignedFeeAgreements;
  }
  async getBasicData(feeAgreement) {
    const  config  = (await ModulePresetsConfigRepository.getById('feeAgreement')).data;
    const company = await feeAgreement.company().fetch();
    const feeAgreementDefaults = config.defaultValues;
    const coachInstance = await feeAgreement.coach().with('personalInformation').fetch();
    const recruiterInstance = await feeAgreement.creator().with('personalInformation').fetch();
    const currentDeclinatorInstance = await feeAgreement.currentDeclinator().with('personalInformation').fetch();
    const productionDirectorInstance = await feeAgreement.productionDirector().with('personalInformation').fetch();
    const regionalDirectorInstance = await UserRepository.getRegionalDirectorByCoachId(feeAgreement.coach_id);
    const hiringAuthority = await feeAgreement.hiringAuthority().fetch();
    const coach = coachInstance ? coachInstance.toJSON() : null;
    const recruiter = recruiterInstance ? recruiterInstance.toJSON() : null;
    const currentDeclinator = currentDeclinatorInstance ? currentDeclinatorInstance.toJSON() : null;
    const productionDirector = productionDirectorInstance ? productionDirectorInstance.toJSON() : null;
    const regionalDirector = regionalDirectorInstance ? regionalDirectorInstance.toJSON() : null;
    return {feeAgreementDefaults, recruiter, coach, currentDeclinator, productionDirector, regionalDirector, company, hiringAuthority};
  }

  async getCreatedAndSentToSignNotifications(feeAgreement) {
    const {regionalDirector, coach, company} = await this.getBasicData(feeAgreement);
    let recruiterNotification;
    if (feeAgreement.creator_id === coach.id) {
      recruiterNotification = null;
    } else {
      recruiterNotification = {
        userIds: feeAgreement.creator_id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement created and sent to sign`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
          }
        }
      };
    }
    const notifications = {
      recruiter: recruiterNotification,
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement created and sent to sign`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
          }
        }
      },
      regionalDirector: {
        userIds: regionalDirector.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement created and sent to sign`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
          }
        }
      },
    };
    return notifications;
  }

  async getCreatedAndSentToCoachValidationNotifications(feeAgreement) {
    const {recruiter, coach} = await this.getBasicData(feeAgreement);
    const notifications = {
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validation request`,
            body: `${recruiter.personalInformation.full_name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementValidation&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementValidation&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }

  async getCreatedAndSentToOperationsValidationNotifications(feeAgreement) {
    const {recruiter} = await this.getBasicData(feeAgreement);
    await UserRepository.getOperationsTeamUsers();
    const drawerToOpen = feeAgreement.verbiage_changes_requested ? `FeeAgreementVerbiageValidation` : `FeeAgreementValidation`;
    const notifications = {
      operationsTeam: {
        userIds: userIds,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validation request`,
            body: `${recruiter.personalInformation.full_name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }

  async getSignedByProductionDirectorNotifications(feeAgreement) {
    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    operationsTeamUsers.rows.map(({id}) => id);
    const {company, recruiter, coach, productionDirector} = await this.getBasicData(feeAgreement);
    const notifications = {
      recruiter: {
        userIds: recruiter.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement signed`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.signedFeeAgreementsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.signedFeeAgreementsTab}`,
          }
        }
      },
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement signed`,
            body: `${recruiter.personalInformation.full_name} - ${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.signedFeeAgreementsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.signedFeeAgreementsTab}`,
          }
        }
      },
      productionDirector: {
        userIds: productionDirector.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement signed`,
            body: `${recruiter.personalInformation.full_name} - ${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.signedFeeAgreementsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.signedFeeAgreementsTab}`,
          }
        }
      },
      operationsTeam: {
        userIds,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement signed`,
            body: `${recruiter.personalInformation.full_name} - ${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.signedFeeAgreementsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.signedFeeAgreementsTab}`,
          }
        }
      }
    };
    return notifications;
  }

  async getSignedByHiringAuthorityNotifications(feeAgreement) {
    if (!feeAgreement.electronic_signature_provider_id || (feeAgreement.electronic_signature_provider_id != SignatureProvider.HelloSign)) return {};
    const {productionDirector, company} = await this.getBasicData(feeAgreement);
    const badge = await CompanyFeeAgreement.query()
      .where('fee_agreement_status_id', FeeAgreementStatus.PendingProductionDirectorSignature)
      .getCount();
    const notifications = {
      productionDirector: {
        userIds: productionDirector.id,
        payload: {
          data: {
            type: notificationCategories.FEE_AGREEMENT,
            title: `Service Agreement with ${company.name}`,
            body: `It's your turn to sign!`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: feeAgreement.sign_url,
            click_url: feeAgreement.sign_url,
            feeAgreementId: feeAgreement.id,
            badge
          }
        }
      }
    };
    return notifications;
  }

  async getValidatedByCoachNotifications(feeAgreement) {
    const {company, recruiter } = await this.getBasicData(feeAgreement);
    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    const drawerToOpen = feeAgreement.verbiage_changes_requested ? 'FeeAgreementVerbiageValidation' : 'FeeAgreementValidation'; 
    const notifications = {
      recruiter: { 
        userIds: recruiter.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement Validated by Coach`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingValidationsTab}`,
          }
        }
      },
      operationsTeam: {
        userIds: userIds,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validation request`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }

  async getSentToCoachValidationNotifications(feeAgreement) {
    const {coach, company } = await this.getBasicData(feeAgreement);
    const notifications = {
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement revalidation request`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementValidation&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementValidation&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }
  
  async getDeclinedByCoachNotifications(feeAgreement) {
    const {recruiter, company } = await this.getBasicData(feeAgreement);
    const notifications = {
      recruiter: {
        userIds: recruiter.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement Declined by Coach`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementNegativeIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementRecruiterReValidation&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementRecruiterReValidation&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }
  
  async getValidatedByOperationsAndSentToSignNotifications(feeAgreement) {
    const {coach, company } = await this.getBasicData(feeAgreement);
    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    const userIds = operationsTeamUsers.rows.map(({id}) => id);
    const notifications = {
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validated and sent to sign.`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
          }
        }
      },
      operationsTeam: {
        userIds: userIds,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement sent to sign.`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };

    if (coach.id != feeAgreement.creator_id) {
      notifications.recruiter = {
        userIds: feeAgreement.creator_id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validated and sent to sign.`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    }

    return notifications;
  }

  async getValidatedByCoachAndSentToSignNotifications(feeAgreement) {
    const {coach, company } = await this.getBasicData(feeAgreement);
    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    const userIds = operationsTeamUsers.rows.map(({id}) => id);
    const notifications = {
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validated and sent to sign.`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
          }
        }
      },
      operationsTeam: {
        userIds: userIds,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement sent to sign.`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };

    if (coach.id != feeAgreement.creator_id) {
      notifications.recruiter = {
        userIds: feeAgreement.creator_id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validated and sent to sign.`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementSummary&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    }

    return notifications;
  }
  
  async getDeclinedByOperationsNotifications(feeAgreement) {
    const {recruiter, company } = await this.getBasicData(feeAgreement);
    const notifications = {
      recruiter: {
        userIds: recruiter.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement Declined by Operations`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementNegativeIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementRecruiterReValidation&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementRecruiterReValidation&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }

  async getSentToOperationsValidationNotifications(feeAgreement) {
    const {company } = await this.getBasicData(feeAgreement);
    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    const userIds = operationsTeamUsers.rows.map(({id}) => id);
    const drawerToOpen = feeAgreement.verbiage_changes_requested ? 'FeeAgreementVerbiageValidation' : 'FeeAgreementValidation';
    const notifications = {
      operationsTeam: {
        userIds: userIds,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement revalidation request`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }

  async getSignatureRequestEmailBouncedNotifications(feeAgreement) {
    const {recruiter, coach, hiringAuthority, company} = await this.getBasicData(feeAgreement);
    const payload = {
      data: {
        feeAgreementId: feeAgreement.id,
        type: notificationCategories.FEE_AGREEMENT,
        title: `Hiring authority email bounced`,
        body: `${company.name} - ${hiringAuthority.full_name} (${hiringAuthority.work_email})`,
        color: notificationColor,
        icon: feeAgreementNegativeIconName,
        click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementValidation&tab=${this.pendingValidationsTab}`,
        click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementValidation&tab=${this.pendingValidationsTab}`,
      }
    };
    const notifications = {
      coach: {
        userIds: coach.id,
        payload
      },
      recruiter: {
        userIds: recruiter.id,
        payload
      }
    };
    return notifications;
  }

  async getSignatureReminderSentNotifications(feeAgreement) {
    const {productionDirector, company} = await this.getBasicData(feeAgreement);
    const badge = await CompanyFeeAgreement.query()
      .where('fee_agreement_status_id', FeeAgreementStatus.PendingProductionDirectorSignature)
      .getCount();
    const notifications = {
      productionDirector: {
        userIds: productionDirector.id,
        payload: {
          data: {
            type: notificationCategories.FEE_AGREEMENT,
            title: `Service Agreement with ${company.name}`,
            body: `It's your turn to sign!`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: feeAgreement.sign_url,
            click_url: feeAgreement.sign_url,
            feeAgreementId: feeAgreement.id,
            badge
          }
        }
      }
    };
    return notifications;
  }

  async getVoidedNotifications(feeAgreement) {
    const {company, coach, recruiter } = await this.getBasicData(feeAgreement);
    const drawerToOpen = feeAgreement.verbiage_changes_requested ? 'FeeAgreementVerbiageValidation' : 'FeeAgreementValidation';
    const recruiterNotification = {
      userIds: recruiter.id,
      payload: {
        data: {
          type: notificationCategories.FEE_AGREEMENT,
          title: `Fee Agreement has been voided`,
          body: `${company.name} - Fee #${feeAgreement.id}`,
          color: notificationColor,
          icon: feeAgreementPositiveIconName,
          click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
          click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
        }
      }
    };

    const notifications = {
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement has been voided`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
          }
        }
      },
      recruiter: feeAgreement.creator_id != coach.id ? recruiterNotification : null
    };
    return notifications;
  }


  async getExpiredNotifications(feeAgreement) {
    const {company, coach, recruiter} = await this.getBasicData(feeAgreement);
    const drawerToOpen = feeAgreement.verbiage_changes_requested ? 'FeeAgreementVerbiageValidation' : 'FeeAgreementValidation';
    const recruiterNotification = {
      userIds: recruiter.id,
      payload: {
        data: {
          type: notificationCategories.FEE_AGREEMENT,
          title: `Fee Agreement has expired`,
          body: `${company.name} - Fee #${feeAgreement.id}`,
          color: notificationColor,
          icon: feeAgreementPositiveIconName,
          click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
          click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
        }
      }
    };

    const notifications = {
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement has expired`,
            body: `${company.name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
          }
        }
      },
      recruiter: feeAgreement.creator_id != coach.id ? recruiterNotification : null
    };
    return notifications;
  }

  async getAboutExpireNotifications(feeAgreement, daysLeft) {
    const {company, coach, recruiter} = await this.getBasicData(feeAgreement);
    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    const userIds = operationsTeamUsers.rows.map(({id}) => id);
    const drawerToOpen = feeAgreement.verbiage_changes_requested ? 'FeeAgreementVerbiageValidation' : 'FeeAgreementValidation';
    const recruiterNotification = {
      userIds: recruiter.id,
      payload: {
        data: {
          type: notificationCategories.FEE_AGREEMENT,
          title: `Fee Agreement is about expire`,
          body: `${company.name} - Fee #${feeAgreement.id} - ${daysLeft} days to expire`,
          color: notificationColor,
          icon: feeAgreementPositiveIconName,
          click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
          click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
        }
      }
    };

    const notifications = {
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement is about expire`,
            body: `${company.name} - Fee #${feeAgreement.id} - ${daysLeft} days to expire`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingSignaturesTab}`,
          }
        }
      },
      recruiter: feeAgreement.creator_id != coach.id ? recruiterNotification : null
    };
    return notifications;
  }

  async getValidationRequestedNotifications(feeAgreement) {
    const {recruiter, coach} = await this.getBasicData(feeAgreement);
    const notifications = {
      coach: {
        userIds: coach.id,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validation request`,
            body: `${recruiter.personalInformation.full_name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementValidation&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=FeeAgreementValidation&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }

  async getValidationRequestedByCoachNotifications(feeAgreement) {
    const {recruiter} = await this.getBasicData(feeAgreement);
    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    const userIds = operationsTeamUsers.rows.map(({id}) => id);
    const drawerToOpen = feeAgreement.verbiage_changes_requested ? `FeeAgreementVerbiageValidation` : `FeeAgreementValidation`;
    const notifications = {
      operationsTeam: {
        userIds: userIds,
        payload: {
          data: {
            feeAgreementId: feeAgreement.id,
            type: notificationCategories.FEE_AGREEMENT,
            title: `Fee Agreement validation request`,
            body: `${recruiter.personalInformation.full_name} - Fee #${feeAgreement.id}`,
            color: notificationColor,
            icon: feeAgreementPositiveIconName,
            click_action: `/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingValidationsTab}`,
            click_url: `${this.publicURLWeb}/feeagreements?id=${feeAgreement.id}&drawer=${drawerToOpen}&tab=${this.pendingValidationsTab}`,
          }
        }
      }
    };
    return notifications;
  }
}

module.exports = FeeAgreementNotification;