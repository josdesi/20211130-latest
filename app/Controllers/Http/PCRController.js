'use strict';

// Packages
const Antl = use('Antl');
const appInsights = use('applicationinsights');
const Database = use('Database');
const { union } = use('lodash');

// Utils
const { PCRSmarTagMap } = use('App/Helpers/Globals');

// Services
const PCRService = use('App/Helpers/Migration/PCRService');

// Repositories
const BulkEmailTemplateRepository = use('App/Helpers/BulkEmailTemplateRepository');

class PCRController {
  constructor() {
    this.pcrService = new PCRService();
    this.bulkEmailTemplateRepository = new BulkEmailTemplateRepository();
  }

  /**
   * Templates from PCR service
   * GET pcr/templates
   *
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async templates({ request, response }) {
    const filters = request.only(['page', 'perPage', 'orderBy', 'direction', 'user', 'keyword']);
    try {
      const templatesResult = await this.pcrService.getTemplates(filters);
      if (!templatesResult.success) {
        throw templatesResult.error;
      }
      return response.status(200).send(templatesResult.data);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'templates data',
        }),
      });
    }
  }

  /**
   * User from PCR service
   * GET pcr/users
   *
   * @param {Response} ctx.response
   */
  async users({ response }) {
    try {
      const usersResult = await this.pcrService.getAllUsers();
      if (!usersResult.success) {
        throw usersResult.error;
      }
      return response.status(200).send(usersResult.data);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'users data',
        }),
      });
    }
  }

  replaceTags(html, text, tags) {
    let htmlWithTags = html,
      textWithTags = text;
    for (const property in tags) {
      const smarTag = tags[property];
      if (smarTag) {
        const newTag = smarTag == '{{remove_tag}}' ? '' : smarTag;
        htmlWithTags = htmlWithTags.replace(property, newTag, 'gi');
        textWithTags = textWithTags.replace(property, newTag, 'gi');
      }
    }
    return {
      htmlWithTags,
      textWithTags,
    };
  }

  /**
   * Creates an email template from a PCR form
   * POST pcr/import/templates
   *
   * @param {Request} ctx.request = {name, userId, formId, subject, html, ignoreExisting, text, typeId}
   * @param {Response} ctx.response
   *
   */
  async importTemplate({ request, response }) {
    const { userId, duplicateExisting = false, tags = {}, templates = [] } = request.all();
    const transaction = await Database.beginTransaction();
    try {
      const userDefaultolders = await this.bulkEmailTemplateRepository.checkUserDefaultFolders(userId, transaction);
      const privateFolder = userDefaultolders.data.find((folder) => folder.is_private);

      for (const template of templates) {
        const { name, formId, subject, html, text } = template;
        if (!duplicateExisting) {
          const existTemplate = await this.bulkEmailTemplateRepository.existSimilarTemplate(name, userId, formId);
          if (existTemplate) {
            continue;
          }
        }
        const { htmlWithTags, textWithTags } = this.replaceTags(html, text, tags);
        const templateData = {
          parent_folder_id: privateFolder.id,
          subject,
          text: textWithTags,
          html: htmlWithTags,
          name,
        };
        await this.bulkEmailTemplateRepository.createEmailTemplate(templateData, userId, transaction, {
          import_id: formId,
        });
      }
      await transaction.commit();
      return response.status(201).send({
        success: true,
        message: Antl.formatMessage('messages.success.creation', {
          entity: 'template',
        }),
      });
    } catch (error) {
      transaction && transaction.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'importing',
          entity: 'template',
        }),
      });
    }
  }

  /**
   * Generates the possible smartags to replace the tags from the templates
   * POST pcr/templates/map/tags
   *
   * @param {Request} ctx.request = {templates}
   * @param {Response} ctx.response
   *
   */
  async mapTags({ request, response }) {
    try {
      const { templates = [] } = request.only(['templates']);
      let validTags = [];
      const pcrMatchTagsRegex = /\[\[(.*?)\]\]/g;
      for (const template of templates) {
        const templateTags = template.match(pcrMatchTagsRegex) || [];
        validTags = union(validTags, templateTags);
      }
      const mappedTags = {};
      validTags.forEach((tag) => {
        const smarTag = PCRSmarTagMap[tag];
        mappedTags[tag] = smarTag ? `{{${smarTag}}}` : '';
      });
      return response.ok(mappedTags);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'importing',
          entity: 'template',
        }),
      });
    }
  }
}

module.exports = PCRController;
