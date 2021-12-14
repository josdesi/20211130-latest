'use strict'
const {
  fee_data,
  splits,
  files,
  sources,
  customFields
} = require('./PlacementValidations');

class UpdatePlacement {
  get rules() {
    return {
      ...fee_data.validations,
      ...splits.validations,
      ...{
        ...files.validations,
        files: 'array',
      },
      ...sources.validations,
      ...customFields.validations
    };
  }

  get messages() {
    return {
      ...fee_data.messages,
      ...splits.messages,
      ...files.messages,
      ...sources.messages,
      ...customFields.messages
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdatePlacement
