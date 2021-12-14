'use strict';

class UpdateBulkEmailTemplateFolder {
  get rules() {
    return {
      name: 'max:254|string',
    };
  }

  get messages() {
    return {
      'name.max': 'The name size is too long.',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateBulkEmailTemplateFolder;
