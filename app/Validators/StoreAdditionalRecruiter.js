'use strict'

const BaseValidator = use('./BaseValidator');
const {  AdditionalRecruiterTypes } = use('App/Helpers/Globals');

class StoreAdditionalRecruiter extends BaseValidator {
  get rules() {
    return {
      type: `required|in:${AdditionalRecruiterTypes.Collaborator},${AdditionalRecruiterTypes.Accountable}`,
      target_recruiter_id: 'required|integer',
      recruiter_to_collaborate_id: `required_when:type,${AdditionalRecruiterTypes.Collaborator}`
    };
  }

  get messages() {
    return {
      'type.in': 'The recruiter type is not valid',
      'target_recruiter_id.required': 'You must provide a recruiter',
      'recruiter_to_collaborate_id.required_when': 'The recruiter to collaborate with is required'
    };
  }
}

module.exports = StoreAdditionalRecruiter
