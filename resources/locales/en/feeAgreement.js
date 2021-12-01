const flatten = use('flat');

const feeAgreent = {
  error:{
    creation: 'There was an error while creating Fee Agreement.  Please try again later',
    validation: 'Unknown error while validating Fee Agreement. Please contact Fortpac Support',
    revalidation: 'Unknown error while revalidating Fee Agreement. Please contact Fortpac Support',
    signatureRequestPreviewCreation: 'There was an error while creating Signature Request preview. Please try again later',
    sendingReminder: `There was an error while sending reminder. Contact Fortpac Support's Glip and attach the Fee Agreement's link for help.`,
    voiding: 'Unknown error while marking this Fee Agreement as Void. Please contact Fortpac Support',
    gettingTemplate: 'There was a problem retrieving the Template. Please try again later',
    fetchingTemplateFromHellosign: 'There was a problem retrieving the Template from Hellosign. Please try again later',
    gettingTemplatesFromConfig: 'There was a problem retrieving Templates. Please contact Fortpac Support.',
    updatingEmails:'There was a problem updating the Emails. Please contact Fortpac Support',
    notFound: 'Fee Agreement not found',
    helloSignTemplateNotFound: 'Hellosign Template not found',
    columFilterNotsupported: 'There was an error while filtering column {column}. Please contact Fortpac Support',
    teamInformationMissing: `Error while identifying your team. Please contact DC team to update your team's information`,
    badFile: 'Bad file source {entity}',
    operationFailed: 'Error while {operation}. Please contact Fortpac Support',
    emailConfigMissing: 'Additional email configuration is missing'
  },

  restriction: {
    onlyCoachRecruiterorRegionalCanCreate: 'Only Coaches, Recruiters or Regional Directors can create Fee Agreements',
    feeAgreementPercentageMinimum: `Fee Percentage cannot be less than {percentage}`,
    feeAmountMandatory: 'Fee amount is required',
    notValidRoleForCoachDeclination: 'Only Coaches can decline a Fee Agreement',
    notCoachAssignedToAgreement: 'This Fee Agreement is already assigned to {coach name}',
    onlyOperationsTeamCanPerformOperationsValidation: 'Only OPS team members can perform this validation',
    onlyOperationsTeamCanSendReminders: 'Only OPS team members can send reminders',
    onlyOperationsTeamCanPerformOperationsDeclination: 'Only OPS team members can perform this declination',
    onlyOperationsTeamCanCreateSignatureRequestPreviews: 'Only OPS team members can create Signature Request previews',
    onlyOperationsTeamCanVoidContracts: 'Only OPS team members can void Fee Agreements',
    onlyOperationsTeamCanRestoreFeeAgreements: 'Only OPS team members can restore an expired Fee Agreement',
    verbiageValidation: 'This Agreeement has a verbiage change request. It is required to create a new Template',
    cantChangeSignatureProvider: 'Signature Provider cannot be changed in current status',
    onlyAssignedUsersCanCancelValidationRequest: 'Only people assigned to this Agreement can cancel a Validation Request',
    onlyOperationsTeamCanValidateExistingFeeAgreements: 'Only OPS team members can validate existing Fee Agreements',
    cannotBeValidatedAsExistingAgreement: 'This Fee Agreement cannot be validated as existing Fee Agreement',
    userCantAppropiate: 'Only Coaches, Regional Directors or OPS team members can create an Agreement on behalf of someone else',
    companyHasNotJobOrders: 'There are no Job Orders registered for this Company',
    badPaymentScheme: 'Invalid payment scheme',
    onlyCreatorCanPerformThisAction: `Only Fee Agreement's creator can perform this action`,
    onlyCoachRegionalOperationsCanValidate: 'Only Coaches, Regional Directors or OPS team members can validate this Agreement',
    contractNotFound: 'Fee Agreement contract not found',
    onlyOneReminderPerHour: 'Error while sending reminder. Only 1 reminder can be sent per hour. Please try again in {minutes} minutes.',
    cantSendWithVerbiageChangeThroughDocusign: `This fee agreement can't be switched to the backup service`,
    alreadyBackupService: `This fee was already switched to backup service`
  },
  success: {
    reminderSent: 'Reminder sent successfully!',
    voidSuccess: 'Contract voided successfully!'
  }
}


module.exports = flatten(feeAgreent);