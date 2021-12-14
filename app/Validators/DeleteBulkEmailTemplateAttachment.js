'use strict';

class DeleteBulkEmailTemplateAttachment {
  get rules() {
    return {
      attachment_id: 'integer|existsFd:attachments,id',
    };
  }

  get messages() {
    return {
      'attachment_id.existsFd': 'The attachment provided is not valid',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = DeleteBulkEmailTemplateAttachment;
