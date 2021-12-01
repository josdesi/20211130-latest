'use strict';
const {
  fee_data,
  sendout,
  files,
  splits,
  sources,
  customFields
} = require('./PlacementValidations');

class StorePlacement {
  get rules() {
    return {
      ...fee_data.validations,
      ...sendout.validations,
      ...splits.validations,
      ...files.validations,
      ...sources.validations,
      ...customFields.validations
    };
  }

  get messages() {
    return {
      ...fee_data.messages,
      ...sendout.messages,
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

module.exports = StorePlacement;
