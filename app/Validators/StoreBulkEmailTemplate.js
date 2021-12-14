'use strict';

class StoreBulkEmailTemplate {
  get rules() {
    return {
      name: 'required|max:254|string',
      subject: 'required|max:254|string',
      text: 'required|string',
      html: 'required|string',
      files: 'array',
      parent_folder_id: 'required|integer|existsFd:email_template_folders,id',
    };
  }

  get messages() {
    return {
      'name.required': 'You must provide a name.',
      'subject.required': 'You must provide a subject.',
      'text.required': 'You must provide a text.',
      'html.required': 'You must provide a html.',
      'parent_folder_id.required': 'You must provide a folder template.',

      'name.max': 'The name size is too long.',
      'subject.max': 'The subject size is too long.',

      'parent_folder_id.existsFd': 'The template folder provided is not valid',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreBulkEmailTemplate;
