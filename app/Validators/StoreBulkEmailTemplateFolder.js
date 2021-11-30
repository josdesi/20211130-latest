'use strict';

class StoreBulkEmailTemplateFolder {
  get rules() {
    return {
      name: 'required|max:255|string',
      parent_folder_id: 'required_when:is_system_folder,false|integer|existsFd:email_template_folders,id',
      is_system_folder: 'boolean',
    };
  }

  get messages() {
    return {
      'name.required': 'You must provide a name',
      'parent_folder_id.required': 'You must pass where the folder will be saved in',

      'parent_folder_id.existsFd': 'Template folder not valid',

      'is_system_folder.boolean': 'The system option must be a boolean',

      'parent_folder_id.required_when': 'A parent is required to all folders that are not for the system',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreBulkEmailTemplateFolder;
