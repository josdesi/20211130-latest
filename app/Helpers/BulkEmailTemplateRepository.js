'use strict';

//Models
const EmailBody = use('App/Models/EmailBody');
const EmailHistory = use('App/Models/EmailHistory');
const EmailTemplate = use('App/Models/EmailTemplate');
const EmailTemplateFolder = use('App/Models/EmailTemplateFolder');
const Attachment = use('App/Models/Attachment');
const User = use('App/Models/User');

//Repositories
const BulkEmailRepository = new (use('App/Helpers/BulkEmailRepository'))();

//Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const { deleteServerFile } = use('App/Helpers/FileHelper');
const { TemplateFolder, Smartags } = use('App/Helpers/Globals');
const { groupBy, uniqWith } = use('lodash');

class BulkEmailTemplateRepository {
  /**
   * Show a list of bulk email templates
   *
   * @param {String} user_id
   *
   * @return {Object} Bulk email template list with a succes message or an error code
   *
   */
  async listingFolders(user_id) {
    try {
      const query = EmailTemplateFolder.query();

      let childrenModelName = 'childrenFolders';
      for (let i = 1; i < TemplateFolder.MaxLevel; i++) {
        query.with(childrenModelName);

        childrenModelName = `${childrenModelName}.childrenFolders`;
      }

      const folders = await query
        .where('created_by', user_id)
        .where('is_default_folder', true)
        .whereNull('parent_folder_id')
        .fetch();

      const result = folders;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when retrieving the the bulk email templates',
      };
    }
  }

  /**
   * Show all availables smartags ready to be used in the bulk body
   *
   * @summary Smartags are little neats words that are substituted later on in the bulk body, like {{first_name}} or {{industry_name}}, take note that the smartags are obtained later on in the bulkEmail helper, this just returns a listing
   *
   *
   * @return {String[]} Array of the smartags, per say, inside return object
   */
  async listingSmartags() {
    try {
      const result = Smartags.map(({ value, name, type }) => {
        return { value: `{{${value}}}`, name, type };
      });

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while getting the bulk smartags',
      };
    }
  }

  addChildrenFoldersQuery(query, keyword, level = 1, scopeId) {
    if (level > TemplateFolder.MaxLevel) {
      return true;
    }

    return query.with(`childrenFolders`, (builder) => {
      builder
        .select([
          Database.raw("'folder' as entity"),
          'email_template_folders.id',
          'email_template_folders.created_by',
          'email_template_folders.name',
          'email_template_folders.created_at',
          'email_template_folders.updated_at',
          'email_template_folders.is_private',
          'email_template_folders.parent_folder_id',
          'pi.full_name as created_by_name',
        ])
        .innerJoin('users', 'users.id', 'email_template_folders.created_by')
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .with('emailTemplates', (_builder) => {
          _builder
            .select([
              Database.raw("'template' as entity"),
              'email_templates.id',
              'email_templates.name',
              'email_templates.created_by',
              'email_templates.email_body_id',
              'email_templates.email_template_folder_id',
              'email_templates.created_at',
              'email_templates.updated_at',
              'pi.full_name as created_by_name',
            ])
            .innerJoin('users', 'users.id', 'email_templates.created_by')
            .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id');
          this.applyKeywordClause(keyword, _builder, 'name');
        });

      this.addChildrenFoldersQuery(builder, keyword, level + 1, scopeId);
    });
  }

  /**
   * Helper method that allows the put a correct possesive at the end of the name. e.g.: Carlos would be Carlos'; Kevin would be Kevin's
   *
   * @param {String} name
   *
   * @return {String} The correct possesive that should be used
   */
  getPossessiveName(name) {
    return name.slice(-1) === 's' ? `${name}'` : `${name}'s`;
  }

  /**
   * Checks if the user has the default folders required, if not, then they are created
   *
   * @summary Each user should have always two (default) folders, the private & the public folder, if the user already have them, nothing happens
   *
   * @param {Number} userId - The user that is being checked
   * @param {Database?} trx - If the creation should be part of a transaction, not necessary, should be used when creating en masse
   *
   * @return {Object} {succes, message?, data?}
   */
  async checkUserDefaultFolders(userId, trx = null) {
    try {
      const userDefaultFolders = await EmailTemplateFolder.query()
        .where('created_by', userId)
        .where('is_default_folder', true)
        .fetch();

      if (userDefaultFolders.rows.length >= 2) {
        return {
          success: true,
          data: userDefaultFolders.toJSON(),
          message: 'User has the neccesary default folders',
        };
      }

      const user = (
        await User.query()
          .where('id', userId)
          .with('personalInformation', (builder) => builder.with('address').with('address.city'))
          .first()
      ).toJSON();

      if (user.personalInformation === null || !user.personalInformation.full_name) {
        return {
          success: true,
          message: 'This user cannot have a folder',
        };
      }
      const folderUserName = this.getPossessiveName(user.personalInformation.full_name.trim());

      const userFolders = [
        {
          created_by: userId,
          name: `${folderUserName} private folders`,
          is_private: true,
          is_system_folder: false,
          is_default_folder: true,
        },
        {
          created_by: userId,
          name: `${folderUserName} public folders`,
          is_private: false,
          is_system_folder: false,
          is_default_folder: true,
        },
      ];

      let folders;
      if (!trx) {
        folders = await EmailTemplateFolder.createMany(userFolders);
      } else {
        folders = await EmailTemplateFolder.createMany(userFolders, trx);
      }

      return {
        success: true,
        data: folders,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      if (trx) throw error;
      return {
        success: false,
      };
    }
  }

  /**
   * Returns the shared folders with their respective templates availables
   *
   * @description This method returns an array object that acts like a tree, where each node is a template (that can or not contain tempaltes). The first pair of folder being shown will be a symbolic 'coach team name' allowing a better view off the templates
   *
   * @param {String} keyword - The name of the template being searched
   * @param {Number} user_id - The user that is wanting to see the shared templates
   *
   * @return {Object[]} shared - The shared folders with templates found in the system
   */
  async getSharedTemplatesFoldersWithTemplates(keyword, user_id, scopeId) {
    let sharedTemplatesFolders = EmailTemplateFolder.query()
      .select([
        Database.raw("'folder' as entity"),
        'email_template_folders.id',
        'email_template_folders.created_by',
        'email_template_folders.name',
        'email_template_folders.created_at',
        'email_template_folders.updated_at',
        'email_template_folders.is_private',
        'email_template_folders.parent_folder_id',
        'pi.full_name as created_by_name',
        'dig.coach_id',
        'coachpi.full_name as coach_full_name',
      ])
      .innerJoin('users', 'users.id', 'email_template_folders.created_by')
      .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .joinRaw(
        `left join (select DISTINCT coach_id, recruiter_id from recruiter_has_industries) as dig on (dig.recruiter_id = email_template_folders.created_by or dig.coach_id = email_template_folders.created_by)`
      )
      .leftJoin('users as coaches', 'coaches.id', 'dig.coach_id')
      .leftJoin('personal_informations as coachpi', 'coachpi.id', 'coaches.personal_information_id')
      .whereNull('parent_folder_id')
      .where({
        is_private: false,
        is_default_folder: true,
        is_system_folder: false,
      })
      .whereNot('email_template_folders.created_by', user_id)
      .orderBy('email_template_folders.name')
      .with('emailTemplates', (builder) => {
        builder
          .select([
            Database.raw("'template' as entity"),
            'email_templates.id',
            'email_templates.name',
            'email_templates.created_by',
            'email_templates.email_body_id',
            'email_templates.email_template_folder_id',
            'email_templates.created_at',
            'email_templates.updated_at',
            'pi.full_name as created_by_name',
          ])
          .innerJoin('users', 'users.id', 'email_templates.created_by')
          .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id');
        this.applyKeywordClause(keyword, builder, 'name');
      });
    sharedTemplatesFolders = this.addChildrenFoldersQuery(sharedTemplatesFolders, keyword, 1, scopeId);

    const rawSharedTemplateFolders = (await sharedTemplatesFolders.fetch()).toJSON();

    const groupedSharedTemplates = groupBy(rawSharedTemplateFolders, 'coach_id');

    const shared = [];

    for (const key of Object.keys(groupedSharedTemplates)) {
      const compositeKeyFunction = (itemA, itemB) => itemA.id === itemB.id;
      const sharedTemplates = uniqWith(groupedSharedTemplates[key], compositeKeyFunction);

      const rawCoachName = sharedTemplates[0].coach_full_name;

      const coachName = rawCoachName ? this.getPossessiveName(rawCoachName.trim()) : 'No';

      //Symbolic folder, as an entity this does not exist...
      shared.push({
        name: `${coachName} team`,
        children: this.processTemplateListing(sharedTemplates),
        id: `f${Math.random()}`,
        entity: 'folder',
      });
    }

    return shared;
  }

  /**
   * Show a list of bulk email templates
   *
   * @param {Object} { keyword }
   * @param {String} user_id
   *
   * @return {Object} Bulk email template list with a succes message or an error code
   */
  async listing({ keyword, hideEmptyFolders }, user_id, scopeId = null) {
    try {
      //Before anything, here the users should checked wheter or not he has the default folders
      await this.checkUserDefaultFolders(user_id);

      let gpacTemplatesFoldersPromise = EmailTemplateFolder.query()
        .select([
          Database.raw("'folder' as entity"),
          'email_template_folders.id',
          'email_template_folders.created_by',
          'email_template_folders.name',
          'email_template_folders.created_at',
          'email_template_folders.updated_at',
          'email_template_folders.is_private',
          'email_template_folders.parent_folder_id',
          'pi.full_name as created_by_name',
        ])
        .innerJoin('users', 'users.id', 'email_template_folders.created_by')
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .whereNull('parent_folder_id')
        .where({
          is_default_folder: false,
          is_system_folder: true,
        })
        .with('emailTemplates', (builder) => {
          builder
            .select([
              Database.raw("'template' as entity"),
              'email_templates.id',
              'email_templates.name',
              'email_templates.created_by',
              'email_templates.email_body_id',
              'email_templates.email_template_folder_id',
              'email_templates.created_at',
              'email_templates.updated_at',
              'pi.full_name as created_by_name',
            ])
            .innerJoin('users', 'users.id', 'email_templates.created_by')
            .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id');
          this.applyKeywordClause(keyword, builder, 'name');
        });
      gpacTemplatesFoldersPromise = this.addChildrenFoldersQuery(gpacTemplatesFoldersPromise, keyword, 1, scopeId);

      let sharedTemplatesFoldersPromise = this.getSharedTemplatesFoldersWithTemplates(keyword, user_id, scopeId);

      let myPublicTemplatesFoldersPromise = EmailTemplateFolder.query()
        .select([
          Database.raw("'folder' as entity"),
          'email_template_folders.id',
          'email_template_folders.created_by',
          'email_template_folders.name',
          'email_template_folders.created_at',
          'email_template_folders.updated_at',
          'email_template_folders.is_private',
          'email_template_folders.parent_folder_id',
          'pi.full_name as created_by_name',
        ])
        .innerJoin('users', 'users.id', 'email_template_folders.created_by')
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .whereNull('parent_folder_id')
        .where({
          is_private: false,
          is_default_folder: true,
          is_system_folder: false,
        })
        .andWhere('email_template_folders.created_by', user_id)
        .with('emailTemplates', (builder) => {
          builder
            .select([
              Database.raw("'template' as entity"),
              'email_templates.id',
              'email_templates.name',
              'email_templates.created_by',
              'email_templates.email_body_id',
              'email_templates.email_template_folder_id',
              'email_templates.created_at',
              'email_templates.updated_at',
              'pi.full_name as created_by_name',
            ])
            .innerJoin('users', 'users.id', 'email_templates.created_by')
            .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id');
          this.applyKeywordClause(keyword, builder, 'name');
        });
      myPublicTemplatesFoldersPromise = this.addChildrenFoldersQuery(
        myPublicTemplatesFoldersPromise,
        keyword,
        1,
        scopeId
      );

      let myPrivateTemplatesFoldersPromise = EmailTemplateFolder.query()
        .select([
          Database.raw("'folder' as entity"),
          'email_template_folders.id',
          'email_template_folders.created_by',
          'email_template_folders.name',
          'email_template_folders.created_at',
          'email_template_folders.updated_at',
          'email_template_folders.is_private',
          'email_template_folders.parent_folder_id',
          'pi.full_name as created_by_name',
        ])
        .innerJoin('users', 'users.id', 'email_template_folders.created_by')
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .whereNull('parent_folder_id')
        .where({
          is_private: true,
          is_default_folder: true,
          is_system_folder: false,
        })
        .andWhere('email_template_folders.created_by', user_id)
        .with('emailTemplates', (builder) => {
          builder
            .select([
              Database.raw("'template' as entity"),
              'email_templates.id',
              'email_templates.name',
              'email_templates.created_by',
              'email_templates.email_body_id',
              'email_templates.email_template_folder_id',
              'email_templates.created_at',
              'email_templates.updated_at',
              'pi.full_name as created_by_name',
            ])
            .innerJoin('users', 'users.id', 'email_templates.created_by')
            .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id');
          this.applyKeywordClause(keyword, builder, 'name');
        });
      myPrivateTemplatesFoldersPromise = this.addChildrenFoldersQuery(
        myPrivateTemplatesFoldersPromise,
        keyword,
        1,
        scopeId
      );

      const [gpacTemplates, myPrivateTemplates, myPublicTemplates, sharedTemplates] = await Promise.all([
        gpacTemplatesFoldersPromise.fetch(),
        myPublicTemplatesFoldersPromise.fetch(),
        myPrivateTemplatesFoldersPromise.fetch(),
        sharedTemplatesFoldersPromise,
      ]);

      const result = {
        gpac: this.processTemplateListing(gpacTemplates.toJSON()),
        shared: sharedTemplates, //Un-comment if shared were to be used
        mine: [
          ...this.processTemplateListing(myPrivateTemplates.toJSON()),
          ...this.processTemplateListing(myPublicTemplates.toJSON()),
        ],
      };

      if (hideEmptyFolders === 'true' || hideEmptyFolders === true) {
        await this.hideEmptyFolders(result.gpac);
        await this.hideEmptyFolders(result.shared);
        await this.hideEmptyFolders(result.mine);
      }

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while retrieving the the bulk emails templates',
      };
    }
  }

  /**
   * Hides those folders that does not have any templates, in a recursive manner
   *
   * @summary This is part 1 of two methods, this works difrently since the first layer does not have children, so instead a simple for of the folderTree is used
   *
   * @param {Object[]} folderTree - Array of folders
   *
   * @return {void} The function modifies the passed variable
   */
  async hideEmptyFolders(folderTree) {
    let keysToRemove = [];
    for (const key of Object.keys(folderTree)) {
      const folder = folderTree[key];

      if (await this.isEmptyFolder(folder)) keysToRemove = [key, ...keysToRemove];
    }

    for (const key of keysToRemove) {
      folderTree.splice(key, 1);
    }
  }

  /**
   * Hides those folders that does not have any templates, in a recursive manner
   *
   * @summary This is part 2 of the two methods, this is expected to be called recursively, since we need to know if the a folder has a children that is a template, if not then delete until the parent that does not pass such rule
   *
   * @param {Object} folder - Object folder, while only folder.children, folder.entity is needed, the whole object should be passed
   *
   * @return {boolean} The folder is empty, does not have templates
   */
  async isEmptyFolder(folder) {
    if (!folder) return true;

    let isEmptyFolder = true;
    let keysToRemove = [];
    for (const key of Object.keys(folder.children)) {
      const child = folder.children[key];

      if (child.entity === 'template') {
        isEmptyFolder = false;
      }

      if (!(await this.isEmptyFolder(child.entity === 'folder' ? child : null))) {
        isEmptyFolder = false;
      } else if (child.entity === 'folder') {
        keysToRemove = [key, ...keysToRemove];
      }
    }

    for (const key of keysToRemove) {
      folder.children.splice(key, 1);
    }

    if (isEmptyFolder) {
      folder.isEmpty = true;
      return true;
    } else {
      return false;
    }
  }

  processTemplateListing(templateFolders) {
    for (const folder of templateFolders) {
      folder.children = [
        ...(folder.emailTemplates === null || folder.emailTemplates === undefined ? [] : folder.emailTemplates),
        ...(folder.childrenFolders === null || folder.childrenFolders === undefined ? [] : folder.childrenFolders),
      ];

      if (
        !(folder.childrenFolders === null || folder.childrenFolders === undefined) &&
        folder.childrenFolders.length > 0
      ) {
        this.processTemplateListing(folder.childrenFolders);
      }

      delete folder.emailTemplates;
      delete folder.childrenFolders;
    }

    return templateFolders;
  }

  /**
   * Creates the email template and body record on the DB
   *
   * @param {Object} templateData = {name, parent_folder_id, subject, text, html, files}
   * @param {String} user_id
   * @param {Transaction} trx
   * @param {Object} templateExtraData = {importId}
   *
   * @return {Object} Body and Template Objects
   *
   */
  async createEmailTemplate(templateData, user_id, trx, templateExtraData = {}){
    const emailBody = await EmailBody.create(
      {
        subject: templateData.subject,
        text: templateData.text,
        html: templateData.html,
      },
      trx
    );

    const emailTemplate = await EmailTemplate.create(
      {
        name: templateData.name,
        created_by: user_id,
        email_body_id: emailBody.id,
        email_template_folder_id: templateData.parent_folder_id,
        ...templateExtraData
      },
      trx
    );

    return {
      emailTemplate,
      emailBody
    }
  }

  /**
   * Creates a email template
   *
   * @param {Object} templateData = {name, parent_folder_id, subject, text, html, files}
   * @param {String} user_id
   * @summary Create a email template to be used personally or globally
   *
   * @return {Object} Search projects created
   *
   */
  async create(templateData, user_id) {
    const trx = await Database.beginTransaction();

    try {
      const isTheUserAllowed = await this.userHasSystemFolderPermission(user_id);

      const emailTemplateFolderQuery = EmailTemplateFolder.query().where('id', templateData.parent_folder_id);

      if (isTheUserAllowed) {
        emailTemplateFolderQuery.where((builder) =>
          builder.where('is_system_folder', true).orWhere('created_by', user_id)
        );
      } else {
        emailTemplateFolderQuery.where('is_system_folder', false).where('created_by', user_id);
      }

      const emailTemplateFolder = await emailTemplateFolderQuery.first();

      if (!emailTemplateFolder) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'The folder could not be found',
        };
      }

      const { emailBody, emailTemplate } = await this.createEmailTemplate(templateData, user_id, trx)

      const { files } = templateData;
      const attachments = await BulkEmailRepository.storeAttachmentsFromFiles(files, user_id, emailBody.id, trx);

      await emailTemplate.loadMany({
        bulkType: (builder) => builder.transacting(trx),
      });
      emailBody.attachments = attachments;
      emailTemplate.emailBody = emailBody;

      const result = emailTemplate;

      const parentFolderTree = await this.getParentFolderTree(templateData.parent_folder_id);
      result.entity = 'template';
      result.parent_folder_tree = parentFolderTree;

      await trx.commit();
      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      await trx.rollback();
      return {
        success: false,
        code: 500,
        message: 'There was a problem while creating the bulk email template',
      };
    }
  }

  /**
   * Return wether or not the user has the gpac template folder edition role/permission
   *
   * @summary Checks if the user passed has enough authorization to create a system folder
   *
   * @param {number} userId - The user that is creating the folder
   *
   * @return {Boolean} isTheUserAllowed
   */
  async userHasSystemFolderPermission(userId) {
    if (userId === 425 || userId === 578) return true; //Temporal, have to check yet if will be using roles or permission

    return false;
  }

  /**
   * Creates a system folder, should be called only from @method createFolder when a folder is being created as a true system folder
   *
   * @param {Object} name - folder name
   * @param {String} userId - creator
   *
   * @return {Object} Bulk Email Template Folder created
   *
   */
  async createSystemFolder(name, userId) {
    const emailTemplateFolder = await EmailTemplateFolder.create({
      created_by: userId,
      name,
      is_private: false,
      is_system_folder: true,
    });

    const result = emailTemplateFolder.toJSON();
    result.entity = 'template';
    result.parent_folder_tree = [];

    return {
      success: true,
      code: 201,
      data: result,
    };
  }

  /**
   * Creates a email template folder
   *
   * @param {Object} { name, is_private, parent_folder_id }
   * @param {String} user_id
   * @summary Creates a email template to be used personally or globally
   *
   * @return {Object} Bulk Email Template Folder created
   *
   */
  async createFolder({ name, parent_folder_id = null, is_system_folder = false }, user_id) {
    try {
      if (is_system_folder) {
        const isTheUserAllowed = await this.userHasSystemFolderPermission(user_id);
        if (!isTheUserAllowed) {
          return {
            success: false,
            code: 403,
            message: 'You do not have the permission to create a system folder',
          };
        }

        if (parent_folder_id === null) {
          return await this.createSystemFolder(name, user_id);
        }
      }

      const duplicateFolder = await EmailTemplateFolder.query()
        .where('parent_folder_id', parent_folder_id)
        .where('name', name)
        // .where('created_by', user_id)
        .first();

      if (duplicateFolder) {
        return {
          success: false,
          code: 409,
          message: 'You already have a folder named like that in the same directory!',
        };
      }

      const parentFolderQuery = EmailTemplateFolder.query()
        .where('is_system_folder', is_system_folder)
        .where('id', parent_folder_id);

      if (!is_system_folder) {
        parentFolderQuery.where('created_by', user_id);
      }

      const parentFolder = await parentFolderQuery.first();

      if (!parentFolder) {
        return {
          success: false,
          code: 404,
          message: 'Parent folder not found',
        };
      }

      const parentFolderTree = await this.getParentFolderTree(parent_folder_id);

      if (parentFolderTree.length >= TemplateFolder.MaxLevel) {
        return {
          success: false,
          code: 409,
          message: 'The folder you are trying to use as a parent is the max level permitted',
        };
      }

      const emailTemplateFolder = await EmailTemplateFolder.create({
        created_by: user_id,
        name,
        is_private: parentFolder.is_private,
        parent_folder_id,
        is_system_folder,
      });

      const result = emailTemplateFolder.toJSON();

      parentFolderTree.push(result.id); //Since we are creating a folder, lets include the folder itself in the tree
      result.parent_folder_tree = parentFolderTree;
      result.entity = 'folder';

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem while creating a email template folder',
      };
    }
  }

  /**
   * Returns an array containing the folder parent tree
   *
   * @summary The array returned contains from right to left (0 is left) the first parent folder to the last (being the parent of folderId passed) folder
   *
   * @param {Number} folderId - The folder which the tree will be obtained from
   *
   * @return {Number[]} Array of numbers, containing the folder tree
   *
   */
  async getParentFolderTree(folderId, parentFolderTree = []) {
    if (!folderId) return parentFolderTree;

    const result = await EmailTemplateFolder.query().where('id', folderId).first();
    if (!result) return parentFolderTree;

    const folderFound = result.toJSON();

    const returningTree = await this.getParentFolderTree(folderFound.parent_folder_id, [
      folderFound.id,
      ...parentFolderTree,
    ]);

    return returningTree;
  }

  /**
   * Show the details of one bulk email template
   *
   * @param {Number} id
   * @param {Number} user_id
   *
   * @return {Object} Bulk email template details with a succes message or an error code
   *
   */
  async details(id, user_id) {
    try {
      const emailTemplate = await EmailTemplate.query()
        .with('emailBody')
        .with('emailBody.attachments')
        .with('emailTemplateFolder')
        .where('id', id)
        .whereHas('emailTemplateFolder', (builder) => {
          builder.where((_builder) =>
            _builder.where('is_system_folder', true).orWhere('created_by', user_id).orWhere('is_private', false)
          );
        })
        .first();

      if (!emailTemplate) {
        return {
          success: false,
          code: 404,
          message: 'Email template not found',
        };
      }

      const templateFolderId = (await emailTemplate.getRelated('emailTemplateFolder')).id;
      const parentFolderTree = await this.getParentFolderTree(templateFolderId);

      const result = emailTemplate.toJSON();

      result.parent_folder_id = result.email_template_folder_id;
      result.entity = 'template';
      result.parent_folder_tree = parentFolderTree;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when retrieving the details of one bulk email template',
      };
    }
  }

  /**
   * Update the template & body of one bulk email template
   *
   * @param {Number} id
   * @param {Object} templateData
   * @param {Object} templateBodyData
   * @param {Array} files
   * @param {Number} user_id
   *
   * @return {Object} Bulk email template new details with a succes message or an error code
   *
   */
  async update(id, templateData, templateBodyData, files, user_id) {
    const trx = await Database.beginTransaction();

    try {
      const isTheUserAllowed = await this.userHasSystemFolderPermission(user_id);

      const emailTemplate = await EmailTemplate.query()
        .with('emailTemplateFolder')
        .with('emailBody')
        .with('emailBody.attachments')
        .where('id', id)
        // .andWhere('created_by', user_id)
        .whereHas('emailTemplateFolder', (builder) => {
          if (isTheUserAllowed) {
            builder.where((_builder) => _builder.where('is_system_folder', true).orWhere('created_by', user_id));
          } else {
            builder.where('is_system_folder', false).where('created_by', user_id);
          }
        })
        .first();

      if (!emailTemplate) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Email template not found',
        };
      }

      if (templateData.parent_folder_id) {
        const emailTemplateFolderQuery = EmailTemplateFolder.query().where('id', templateData.parent_folder_id);

        if (isTheUserAllowed) {
          emailTemplateFolderQuery.where((builder) =>
            builder.where('is_system_folder', true).orWhere('created_by', user_id)
          );
        } else {
          emailTemplateFolderQuery.where('is_system_folder', false).where('created_by', user_id);
        }

        const emailTemplateFolder = await emailTemplateFolderQuery.first();

        if (!emailTemplateFolder) {
          trx.rollback();
          return {
            success: false,
            code: 404,
            message: 'The folder could not be found',
          };
        }

        templateData.email_template_folder_id = templateData.parent_folder_id;
        delete templateData.parent_folder_id;
      }

      const attachments = await BulkEmailRepository.storeAttachmentsFromFiles(
        files,
        user_id,
        emailTemplate.getRelated('emailBody').id,
        trx
      );

      await emailTemplate.merge(templateData, trx);
      await emailTemplate.save(trx);
      await emailTemplate.loadMany({
        bulkType: (builder) => builder.transacting(trx),
      });

      await emailTemplate.getRelated('emailBody').merge(templateBodyData, trx);
      await emailTemplate.getRelated('emailBody').save(trx);

      const result = emailTemplate.toJSON();
      result.emailBody.attachments.push(...attachments);

      const templateFolderId = templateData.email_template_folder_id
        ? templateData.email_template_folder_id
        : (await emailTemplate.getRelated('emailTemplateFolder')).id;
      const parentFolderTree = await this.getParentFolderTree(templateFolderId);

      result.entity = 'template';
      result.parent_folder_tree = parentFolderTree;

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      await trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while updating one bulk email template',
      };
    }
  }

  /**
   * Update the details of one template folder
   *
   * @param {Number} id
   * @param {Object} { name }
   * @param {Number} user_id
   *
   * @return {Object} Bulk email template folder new details with a succes message or an error code
   *
   */
  async updateFolder(id, { name, is_system_folder = false }, user_id) {
    try {
      if (is_system_folder) {
        const isTheUserAllowed = await this.userHasSystemFolderPermission(user_id);
        if (!isTheUserAllowed) {
          return {
            success: false,
            code: 403,
            message: 'You do not have the permission to create a system folder',
          };
        }
      }

      const templateFolderQuery = EmailTemplateFolder.query()
        .where('is_system_folder', is_system_folder)
        .where('is_default_folder', false)
        .where('id', id);

      if (!is_system_folder) {
        templateFolderQuery.where('created_by', user_id);
      }

      const templateFolder = await templateFolderQuery.first();

      if (!templateFolder) {
        return {
          success: false,
          code: 404,
          message: 'Template folder not found',
        };
      }

      const duplicateFolder = await EmailTemplateFolder.query()
        .where('parent_folder_id', templateFolder.parent_folder_id)
        .where('is_system_folder', is_system_folder)
        .where('name', name)
        // .where('created_by', user_id)
        .first();

      if (duplicateFolder) {
        return {
          success: false,
          code: 409,
          message: 'You already have a folder named like that in the same directory!',
        };
      }

      const parentFolderTree = await this.getParentFolderTree(id);

      await templateFolder.merge({ name });
      await templateFolder.save();

      const result = templateFolder;
      result.parent_folder_tree = parentFolderTree;
      result.entity = 'folder';

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while updating a bulk email template folder',
      };
    }
  }

  /**
   * Delete one of the own bulk email template
   *
   * @param {Number} id - Email Template id
   * @param {Number} user_id - User id
   *
   * @return {Object} Bulk email template details that was deleted with a succes message or an error code
   *
   */
  async destroy(id, user_id) {
    const trx = await Database.beginTransaction();
    try {
      const isTheUserAllowed = await this.userHasSystemFolderPermission(user_id);

      const emailTemplate = await EmailTemplate.query()
        .with('emailBody')
        .with('emailBody.attachments')
        .where('id', id)
        // .andWhere('created_by', user_id)
        .whereHas('emailTemplateFolder', (builder) => {
          if (isTheUserAllowed) {
            builder.where((_builder) => _builder.where('is_system_folder', true).orWhere('created_by', user_id));
          } else {
            builder.where('is_system_folder', false).where('created_by', user_id);
          }
        })
        .first();

      if (!emailTemplate) {
        await trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Email template not found',
        };
      }

      const emailTemplateInUse = await EmailHistory.query().where('email_template_id', emailTemplate.id).first();

      if (emailTemplateInUse) {
        await trx.rollback();
        return {
          success: false,
          code: 409,
          message: 'Could not delete the template, one email has been sent using that template',
        };
      }

      await EmailTemplate.query().transacting(trx).where('id', id).delete();

      const attachments = await (await emailTemplate.getRelated('emailBody')).getRelated('attachments');

      for (const attachment of attachments.rows) {
        await deleteServerFile(attachment.url);
        await Attachment.query().transacting(trx).where('id', attachment.id).delete();
      }

      await EmailBody.query().transacting(trx).where('id', emailTemplate.email_body_id).delete();

      const result = emailTemplate;

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      await trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when destroying one bulk email template',
      };
    }
  }

  /**
   * Delete one of the own bulk email template attachments
   *
   * @param {Number} id
   * @param {Number} { attachment_id }
   * @param {Number} user_id
   *
   * @return {Object} Atachment details that was deleted with a succes message or an error code
   *
   */
  async destroyAttachment(id, { attachment_id }, user_id) {
    const trx = await Database.beginTransaction();
    try {
      const emailTemplate = await EmailTemplate.query()
        .with('emailBody')
        .with('emailBody.attachments')
        .where('id', id)
        // .andWhere('created_by', user_id)
        .whereHas('emailTemplateFolder', (builder) => {
          if (isTheUserAllowed) {
            builder.where((_builder) => _builder.where('is_system_folder', true).orWhere('created_by', user_id));
          } else {
            builder.where('is_system_folder', false).where('created_by', user_id);
          }
        })
        .first();

      if (!emailTemplate) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Email template not found',
        };
      }

      const attachments = await (await emailTemplate.getRelated('emailBody')).getRelated('attachments');

      const attachment = attachments.rows.find((row) => row.id === attachment_id);

      if (!attachment) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Attachment not found',
        };
      }

      await deleteServerFile(attachment.url);
      await attachment.delete(trx);

      const result = attachment;

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when deleting the attachment',
      };
    }
  }

  /**
   * Destroys a email template folder
   *
   * @param {Request} req
   * @param {String} user_id
   * @summary Destroys a email template from that user
   *
   * @return {Object} Bulk Email Template Folder destroyed
   *
   */
  async destroyFolder(id, user_id) {
    const trx = await Database.beginTransaction();

    try {
      const templateFolder = await EmailTemplateFolder.query()
        .where('id', id)
        .with('childrenFolders')
        .where('is_system_folder', false)
        .where('is_default_folder', false)
        .where('created_by', user_id)
        .first();

      if (!templateFolder) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Template folder not found',
        };
      }

      const emailTemplates = await EmailTemplate.query().where('email_template_folder_id', id).first();
      if (emailTemplates) {
        trx.rollback();
        return {
          success: false,
          code: 409,
          message: 'That template folder is being used by email templates, cannot delete the folder',
        };
      }

      const childrenFolders = await templateFolder.getRelated('childrenFolders');
      if (childrenFolders.rows.length > 0) {
        trx.rollback();
        return {
          success: false,
          code: 409,
          message: 'That template folder is being used by other folders, cannot delete the folder',
        };
      }

      await templateFolder.delete(trx);

      const result = templateFolder.toJSON();

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx.rollback();
      return {
        success: false,
        code: 500,
        message: 'There was a problem while deleting a email template folder',
      };
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  applyKeywordClause(keyword, query, field) {
    if (keyword) {
      query.where(field, 'ilike', `%${keyword}%`);
    }
  }

  /**
   * Validates if there's already a template with 
   * the data provided
   *
   * @param {String} name
   * @param {Integer} userId
   * @param {Integer} importId
   */
  async existSimilarTemplate(name, userId, importId){
    return await EmailTemplate.query().where('created_by', userId).where((builder) =>
        builder.where('import_id', importId).orWhere({ name })
    ).first();
  }
}

module.exports = BulkEmailTemplateRepository;
