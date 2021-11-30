'use strict'

class ValidateUnmangedFeeAgreement {
  get rules () {
    return {
      id: 'required|integer',
      hiring_authority_id: 'number|existsFd:hiring_authorities,id',
      notes: 'string',
      signed_date: 'date',
      temp_file_id: 'number|existsFd:user_has_temp_files,id'
    }
  }

  get messages() {
    return {
      'hiring_authority_id.number':'Hiring id must be a valid hiring authority id',
      'hiring_authority_id.existsFd':'Hiring id must be a valid hiring authority id',
      'notes.string':'Notes must be a text',
      'signed_date.date':'Signed date must be a date',
      'temp_file_id.number':'Temp file must be a valid temporary file id',
      'temp_file_id.existsFd':'Temp file must be a valid temporary file id',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = ValidateUnmangedFeeAgreement
