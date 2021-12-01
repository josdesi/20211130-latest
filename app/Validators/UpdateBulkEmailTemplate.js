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
      bulk_email_scope_type_id: 'integer|existsFd:bulk_email_scope_types,id',
    };
  }

  get messages() {
    return {
      'name.max': 'The name size is too long.',
      'subject.max': 'The subject size is too long.',

      'bulk_email_scope_type_id.integer': 'The scope must be an id reference',

      'parent_folder_id.existsFd': 'The template folder provided is not valid',
      'bulk_email_scope_type_id.existsFd': 'The bulk email scope provided is not valid',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateBulkEmailTemplate;
