'use strict';

class UpdateBulkEmailTemplate {
  get rules() {
    return {
      name: 'max:254|string',
      subject: 'max:254|string',
      text: 'string',
      html: 'string',
      files: 'array',
      parent_folder_id: 'integer|existsFd:email_template_folders,id',
    };
  }

  get messages() {
    return {
      'name.max': 'The name size is too long.',
      'subject.max': 'The subject size is too long.',


      'parent_folder_id.existsFd': 'The template folder provided is not valid',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateBulkEmailTemplate;
