'use strict';

const { find } = require("lodash");

//Models
const PlacementSplit = use('App/Models/PlacementSplit');
const PlacementSuggestedUpdate = use('App/Models/PlacementSuggestedUpdate');
const PlacementStatus = use('App/Models/PlacementStatus');

//Utils
const Env = use('Env');
const moment = use('moment');
const GenericSendgridTemplateEmail = new (use('App/Emails/GenericSendgridTemplateEmail'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const { userRoles } = use('App/Helpers/Globals');
const { adjustmentsToShow, placementEmailTemplates } = use('App/Utils/PlacementUtils');;
const userTypes = {
  CompanyRecruiters: 'CompanyRecruiters',
  CandidateRecruiters: 'CandidateRecruiters',
  CompanyCoaches : 'CompanyCoaches',
  CompanyDirectors: 'CompanyDirectors',
  FinanceTeam : 'FinanceTeam',
  ChannelPartners: 'ChannelPartners'
}
class PlacementEmails {
  async sendOnCreation(placement) {
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, created_by: userId, placement_status_id } = placement;
    const { hasAtLeastOne, assignedRoles } = await UserRepository.hasRoles(userId, [userRoles.Recruiter, userRoles.Coach, userRoles.RegionalDirector]);

    if(!hasAtLeastOne){
      return;
    }
    const splits = await this.getSplits(placementId);
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const {
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
      joborder: { title: jobOrderTitle, company: { name: companyName } = {} } = {},
      hiringAuthorithies = [],
    } = sendout;

    const { candidateRecruiter, companyRecruiter } = await this.getFormattedRecruiterLabelFromSplits(splits);

    const { full_name: userName } = { ...(await UserRepository.getDetails(userId)) };

    const [hiringData = {}] = hiringAuthorithies;
    const { hiringAuthority: { full_name: hiringName } = {} } = hiringData;

    const { title: status = '' } = await PlacementStatus.find(placement_status_id);
    
    const dynamic_template_data = {
      company: companyName,
      hiring: hiringName,
      joborder: jobOrderTitle,
      candidate: candidateName,
      candidate_recruiter: candidateRecruiter,
      company_recruiter: companyRecruiter,
      user_name: userName,
      status,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    }
    let recipientsToMap, sendgridConfigurationName;

    const basicUsers = [ userTypes.CompanyRecruiters, userTypes.CandidateRecruiters, userTypes.CompanyCoaches ];
    if(assignedRoles.includes(userRoles.RegionalDirector)){
      recipientsToMap = await this.getRecipients([
        ...basicUsers,
        userTypes.CompanyDirectors,
        userTypes.FinanceTeam,
        userTypes.ChannelPartners
      ], splits);
      sendgridConfigurationName = placementEmailTemplates.PlacementOnRegionalCreation.type;
    }else if(assignedRoles.includes(userRoles.Coach)){
      recipientsToMap = await this.getRecipients([
        ...basicUsers,
        userTypes.CompanyDirectors,
      ], splits);
      sendgridConfigurationName = placementEmailTemplates.PlacementOnCoachCreation.type;
    }else{
      recipientsToMap = await this.getRecipients(basicUsers, splits);
      sendgridConfigurationName = placementEmailTemplates.PlacementOnRecruiterCreation.type;
    }
    
    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data
      }
    })

    const generalDynamicTemplateData = null;
    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnRequestUpdate(placement) {
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, created_by: userId, created_at } = placement;
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const [suggestedUpdate = {}] = (
      await PlacementSuggestedUpdate.query()
        .where('placement_id', placementId)
        .orderBy('created_at', 'desc')
        .limit(1)
        .fetch()
    ).toJSON();
    const { description, user_id : requestUserId = null } = suggestedUpdate;
    if(!description) return;

    const splits = await this.getSplits(placementId);

    const { coach_id, regional_director_id } =  await UserRepository.getCoachAndRegionalDirector(userId);

    if(requestUserId !== regional_director_id && requestUserId !== coach_id ){
      return;
    }

    const { 
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
     } = sendout;

    const { first_name: userFirstName } = {
      ...(await UserRepository.getDetails(requestUserId)),
    };

    const dynamic_template_data = {
      candidate: candidateName,
      user_first_name: userFirstName,
      placement_date: moment(created_at).fromNow(),
      changes_requested: description,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    };

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters, 
      userTypes.CandidateRecruiters
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data: {
          ...dynamic_template_data,
          isCompanyRecruiter: userInfo.userType == userTypes.CompanyRecruiters
        }
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnRequestedUpdate.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnUpdatedRequest(placement) {
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, created_by: userId, updated_by } = placement;
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }

    const splits = await this.getSplits(placementId);

    const [suggestedUpdate = {}] = (
      await PlacementSuggestedUpdate.query()
        .where('placement_id', placementId)
        .orderBy('created_at', 'desc')
        .limit(1)
        .fetch()
    ).toJSON();
    const { description, user_id : requestUserId = null } = suggestedUpdate;

    if(!description) return;

    const { coach_id, regional_director_id } =  await UserRepository.getCoachAndRegionalDirector(userId);

    if(requestUserId !== regional_director_id && requestUserId !== coach_id){
      return;
    }

    const { 
      joborder: { company: { name: companyName } = {} } = {},
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
    } = sendout;

    const {  first_name: userFirstName } = {
      ...(await UserRepository.getDetails(requestUserId)),
    };
    const { first_name: recruiterFirstName } = {
      ...(await UserRepository.getDetails(updated_by)),
    };

    const  dynamic_template_data = {
      company: companyName,
      candidate: candidateName,
      company_recruiter_first_name: recruiterFirstName,
      coach_first_name: userFirstName,
      changes_requested: description,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    };

    let recipientsToMap;
    if(requestUserId == regional_director_id){
      recipientsToMap = await this.getRecipients([
        userTypes.CandidateRecruiters,
        userTypes.CompanyDirectors
      ], splits);
    }else{
      recipientsToMap = await this.getRecipients([
        userTypes.CandidateRecruiters,
        userTypes.CompanyCoaches
      ], splits);
    }

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data: {
          ...dynamic_template_data,
          isCompanyCoach: userInfo.userType == userTypes.CompanyCoaches || userInfo.userType == userTypes.CompanyDirectors
        }
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnUpdatedRequest.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnRegionalApproval(placement) {
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, updated_by: userId, placement_status_id } = placement;
    const splits = await this.getSplits(placementId);
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const {
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
      joborder: { title: jobOrderTitle, company: { name: companyName } = {} } = {},
      hiringAuthorithies = [],
    } = sendout;

    const { candidateRecruiter, companyRecruiter } = await this.getFormattedRecruiterLabelFromSplits(splits);

    const { full_name: userName } = { ...(await UserRepository.getDetails(userId)) };

    const [hiringData = {}] = hiringAuthorithies;
    const { hiringAuthority: { full_name: hiringName } = {} } = hiringData;

    const { title: status = '' } = await PlacementStatus.find(placement_status_id);
    
    const dynamic_template_data = {
      company: companyName,
      hiring: hiringName,
      joborder: jobOrderTitle,
      candidate: candidateName,
      company_recruiter: companyRecruiter,
      candidate_recruiter: candidateRecruiter,
      status,
      user_approval: userName,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    }

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters,
      userTypes.CandidateRecruiters,
      userTypes.CompanyCoaches,
      userTypes.CompanyDirector,
      userTypes.FinanceTeam,
      userTypes.ChannelPartners
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnRegionalApproval.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnFallOffRequest(placement){
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, fall_off_reason = '', updated_by: userId } = placement;
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const splits = await this.getSplits(placementId);
    const { 
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
    } = sendout;

    const { full_name: userName } = {
      ...(await UserRepository.getDetails(userId)),
    };

    const dynamic_template_data = {
      candidate: candidateName,
      regional_name: userName,
      fall_off_reason,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    }

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters,
      userTypes.CandidateRecruiters,
      userTypes.CompanyCoaches,
      userTypes.CompanyDirector,
      userTypes.FinanceTeam,
      userTypes.ChannelPartners
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data: {
          ...dynamic_template_data,
          isFinance: userInfo.userType == userTypes.FinanceTeam
        }
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnFallOffRequest.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnFallOffCompleted(placement){
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, fall_off_reason = '', updated_by: userId } = placement;
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const splits = await this.getSplits(placementId);
    const { 
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
    } = sendout;

    const { full_name: userName } = {
      ...(await UserRepository.getDetails(userId)),
    };

    const dynamic_template_data = {
      candidate: candidateName,
      finance_person: userName,
      fall_off_reason,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    }

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters,
      userTypes.CandidateRecruiters,
      userTypes.CompanyCoaches,
      userTypes.CompanyDirector,
      userTypes.FinanceTeam,
      userTypes.ChannelPartners
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnFallOffCompleted.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnRevertFallOffRequest(placement){
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, updated_by: userId, placement_status_id } = placement;
    const splits = await this.getSplits(placementId);
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const { title: status = '' } = await PlacementStatus.find(placement_status_id);
    const {
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
      joborder: { title: jobOrderTitle, company: { name: companyName } = {} } = {},
      hiringAuthorithies = [],
    } = sendout;

    const { candidateRecruiter, companyRecruiter } = await this.getFormattedRecruiterLabelFromSplits(splits);

    const { full_name: userName } = {
      ...(await UserRepository.getDetails(userId)),
    };

    const [hiringData = {}] = hiringAuthorithies;
    const { hiringAuthority: { full_name: hiringName } = {} } = hiringData;

    const dynamic_template_data = {
      regional_name: userName,
      company: companyName,
      hiring: hiringName,
      joborder: jobOrderTitle,
      candidate: candidateName,
      company_recruiter: companyRecruiter,
      candidate_recruiter: candidateRecruiter,
      status,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    }

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters,
      userTypes.CandidateRecruiters,
      userTypes.CompanyCoaches,
      userTypes.CompanyDirector,
      userTypes.FinanceTeam,
      userTypes.ChannelPartners
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data: {
          ...dynamic_template_data,
          isFinance: userInfo.userType == userTypes.FinanceTeam
        }
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnRevertFallOffRequest.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }
  
  async sendOnRevertFallOffCompleted(placement){
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, updated_by: userId, placement_status_id } = placement;
    const splits = await this.getSplits(placementId);
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const { title: status = '' } = await PlacementStatus.find(placement_status_id);
    const {
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
      joborder: { title: jobOrderTitle, company: { name: companyName } = {} } = {},
      hiringAuthorithies = [],
    } = sendout;

    const { candidateRecruiter, companyRecruiter } = await this.getFormattedRecruiterLabelFromSplits(splits);

    const { full_name: userName } = {
      ...(await UserRepository.getDetails(userId)),
    };

    const [hiringData = {}] = hiringAuthorithies;
    const { hiringAuthority: { full_name: hiringName } = {} } = hiringData;

    const dynamic_template_data = {
      company: companyName,
      hiring: hiringName,
      joborder: jobOrderTitle,
      candidate: candidateName,
      company_recruiter: companyRecruiter,
      candidate_recruiter: candidateRecruiter,
      finance_person: userName,
      status,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    }

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters,
      userTypes.CandidateRecruiters,
      userTypes.CompanyCoaches,
      userTypes.CompanyDirector,
      userTypes.FinanceTeam,
      userTypes.ChannelPartners
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnRevertFallOffCompleted.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnAdjustment(placement, _changes = {}){
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, updated_by: financeId, created_by: userId } = placement;
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const splits = await this.getSplits(placementId);
    const { 
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
    } = sendout;

    const { first_name: recruiterFirstName } = {
      ...(await UserRepository.getDetails(userId)),
    };
    const { full_name: financeFullName } = {
      ...(await UserRepository.getDetails(financeId)),
    };
    const changes = [];
    for(const val of adjustmentsToShow){
      let value;
      const { title, field, format } = val;
      if(_changes[field]){
        switch (format) {
          case 'percentage':
            value = `${_changes[field]}%`;
            break;

          case 'currency':
            value = `$${_changes[field].toLocaleString()}`;
            break;

          case 'date':
            value =  moment(_changes[field]).format('L');
            break;

          default: 
            value = _changes[field];
            break;
        }
        changes.push({
          field:title,
          value
        })
      }
    }

    const dynamic_template_data = {
      candidate: candidateName,
      company_recruiter_fn: recruiterFirstName,
      finance_person: financeFullName,
      changes,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    }

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters,
      userTypes.CandidateRecruiters,
      userTypes.CompanyCoaches,
      userTypes.CompanyDirector,
      userTypes.FinanceTeam
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementRecruiterAdjustmentEmail.type;

    if(changes.length > 0){
      await GenericSendgridTemplateEmail.sendViaConfig(
        recipients,
        generalDynamicTemplateData,
        sendgridConfigurationName
      );
    }
  }
  
  async sendOnCoachApproval(placement){
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id, updated_by: userId, placement_status_id } = placement;
    const splits = await this.getSplits(placementId);
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const {
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
      joborder: { title: jobOrderTitle, company: { name: companyName } = {} } = {},
      hiringAuthorithies = [],
    } = sendout;

    const { candidateRecruiter, companyRecruiter } = await this.getFormattedRecruiterLabelFromSplits(splits);

    const { full_name: coachName } = await UserRepository.getDetails(userId);

    const [hiringData = {}] = hiringAuthorithies;
    const { hiringAuthority: { full_name: hiringName } = {} } = hiringData;

    const { title: status = '' } = await PlacementStatus.find(placement_status_id);
    
    const dynamic_template_data = {
      company: companyName,
      hiring: hiringName,
      joborder: jobOrderTitle,
      candidate: candidateName,
      coach_name: coachName,
      company_recruiter: companyRecruiter,
      candidate_recruiter: candidateRecruiter,
      status,      
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`
    };

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters, 
      userTypes.CandidateRecruiters,
      userTypes.CompanyDirectors
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data: {
          ...dynamic_template_data,
          isCompanyRegional: userInfo.userType == userTypes.CompanyDirectors
        }
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnCoachApproval.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnInvoiceAdded(placement, invoiceData = {}){
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id } = placement;
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const splits = await this.getSplits(placementId);
    const { number, created_by : financeUserId } = invoiceData;
    const {
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
    } = sendout;

    const { full_name: financeFullName } = {
      ...(await UserRepository.getDetails(financeUserId)),
    };

    const dynamic_template_data = {
      candidate: candidateName,
      finance_person: financeFullName,
      invoice_number: number,
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    };

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters, 
      userTypes.CandidateRecruiters
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data
      }
    })

    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnInvoiceAdded.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }

  async sendOnPaymentAdded(placement, paymentData = {}){
    const SendOutRepository = new (use('App/Helpers/SendOutRepository'))();
    const { id: placementId, sendout_id } = placement;
    const sendout = { ...(await SendOutRepository.details(sendout_id, SendOutRepository.defaultRelations)) };
    if (!sendout) {
      return;
    }
    const splits = await this.getSplits(placementId);
    const { amount, created_by : financeUserId, created_at } = paymentData;
    const {
      candidate: { personalInformation: { full_name: candidateName } = {} } = {},
    } = sendout;

    const { full_name: financeFullName } = {
      ...(await UserRepository.getDetails(financeUserId)),
    };

    const dynamic_template_data = {
      candidate: candidateName,
      finance_person: financeFullName,
      payment: amount,
      payment_date: moment(created_at).format('L'),
      url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${placementId}`,
    };

    const recipientsToMap = await this.getRecipients([
      userTypes.CompanyRecruiters, 
      userTypes.CandidateRecruiters
    ], splits);

    const recipients = recipientsToMap.map((userInfo) => {
      return {
        to: userInfo,
        dynamic_template_data
      }
    })


    const generalDynamicTemplateData = null;

    const sendgridConfigurationName = placementEmailTemplates.PlacementOnPaymentAdded.type;

    await GenericSendgridTemplateEmail.sendViaConfig(
      recipients,
      generalDynamicTemplateData,
      sendgridConfigurationName
    );
  }


  async getRecipients(usersToGet = [], splits = []){
    const recipients = [];
    const companyUsers = splits.filter(val => val.type === 'company' && !val.is_channel_partner);
    const candidateUsers = splits.filter(val => val.type === 'candidate' && !val.is_channel_partner);
    for(const userType of usersToGet){
      switch (userType) {
        case userTypes.CompanyRecruiters:
          for(const userSplit of companyUsers){
            const { user: {  personalInformation: { full_name } = {}, email } = {}} = userSplit;
            recipients.push({ name: full_name, email, userType: userTypes.CompanyRecruiters });
          }
          break;
      
        case userTypes.CandidateRecruiters:
          for(const userSplit of candidateUsers){
            const { user: {  personalInformation: { full_name } = {}, email } = {}} = userSplit;
            recipients.push({ name: full_name, email, userType: userTypes.CandidateRecruiters });
          }
          break;

        case userTypes.CompanyCoaches:
          for(const userSplit of companyUsers){
            const { user_id } = userSplit;
            const { full_name, email } = { ...(await RecruiterRepository.getCoachInfoByRecruiterId(user_id)) };
            recipients.push({ name: full_name, email, userType: userTypes.CompanyCoaches });
          }
          break;

        case userTypes.CompanyDirectors:
          for(const userSplit of companyUsers){
            const { user_id } = userSplit;
            const { regional_director_id } =  await UserRepository.getCoachAndRegionalDirector(user_id);
            const { full_name, email } = {...(await UserRepository.getDetails(regional_director_id))};
            recipients.push({ name: full_name, email, userType: userTypes.CompanyDirectors });
          }
          break;

        case userTypes.FinanceTeam:
          const { rows = [] } = await UserRepository.getUsersByRole(userRoles.Finance);
          for(const user of rows){
            const { id } = user;
            const { full_name, email } = {...(await UserRepository.getDetails(id))};
            recipients.push({ name: full_name, email, userType: userTypes.FinanceTeam });
          }
          break;

        case userTypes.ChannelPartners:
          for(const userSplit of splits.filter(val => val.is_channel_partner === true)){
            const { user: {  personalInformation: { full_name } = {}, email } = {}} = userSplit;
            recipients.push({ name: full_name, email, userType: userTypes.ChannelPartners });
          }
          break;
      }
    }
    const res = [];
    for(const recipient of recipients){
      const { email = null, name, userType } = recipient;
      if(email && !find(res,{ email })){
        res.push({ email, name, userType });
      }
    }
    return res;
  }

  async getFormattedRecruiterLabelFromSplits(splits) {
    let companyRecruiter = '',
      candidateRecruiter = '';
    const formatLabel = (str = '', splitUserName = '', coachSplitName = '', splitInitialsUser = '') => {
      return str.concat(
        `${str.length > 0 ? ' / ' : ''}${splitUserName} ${coachSplitName.length > 0 ? `(${coachSplitName}'s Team)` : ''} - ${splitInitialsUser}`
      );
    };
    for (const split of splits) {
      const {
        type,
        is_channel_partner,
        user_id: splitUserId,
        user: { initials: splitInitialsUser, personalInformation: { full_name: splitUserName } = {} } = {},
      } = split;
      if (is_channel_partner) {
        continue;
      }
      const { full_name: coachSplitName } = { ...(await RecruiterRepository.getCoachInfoByRecruiterId(splitUserId)) };
      if (type === 'company') {
        companyRecruiter = formatLabel(companyRecruiter, splitUserName, coachSplitName, splitInitialsUser);
      } else {
        candidateRecruiter = formatLabel(candidateRecruiter, splitUserName, coachSplitName, splitInitialsUser);
      }
    }
    //Assign same data if solo deal
    if(splits.filter( val => val.type === 'company').length === 0){
      companyRecruiter = candidateRecruiter;
    }else if(splits.filter( val => val.type === 'candidate').length === 0){
      candidateRecruiter = companyRecruiter;
    }
    return {
      companyRecruiter,
      candidateRecruiter,
    };
  }

  async getSplits(placementId){
    return (
      await PlacementSplit.query().with('user.personalInformation').where('placement_id', placementId).fetch()
    ).toJSON();
  }
}

module.exports = PlacementEmails;
