'use strict';
//Models
const UserHasRole = use('App/Models/UserHasRole');
const RecruiterHasIndustry = use('App/Models/RecruiterHasIndustry');
const UserHasPermission = use('App/Models/UserHasPermission');
const User = use('App/Models/User');
const TokenMeta = use('App/Models/TokenMeta');
const Token = use('App/Models/Token');
const PersonalInformation = use('App/Models/PersonalInformation');
const Contact = use('App/Models/Contact');
const Address = use('App/Models/Address');
const ChannelPartner = use('App/Models/ChannelPartner');
const UserChangeLog = use('App/Models/UserChangeLog');
const Team = use('App/Models/Team');
const MicrosoftGraphToken = use('App/Models/MicrosoftGraphToken');
const MicrosoftGraphSubscription = use('App/Models/MicrosoftGraphSubscription');

//Utils
const Database = use('Database');
const colors = use('nice-color-palettes');
const { flatten } = use('lodash');
const appInsights = require('applicationinsights');
const { userRoles, userStatus, DateFormats, WebSocketNamespaces, userFields } = use('App/Helpers/Globals');
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const Encryption = use('Encryption');
const { isNil, find, isEmpty } = use('lodash');
const default_address = '116 W. 69th Street Suite 200';
const default_zip = 57108;
const Env = use('Env');
const { multipleFilterParser, defaultWhereResolver, multipleWhereResolver } = (use('App/Helpers/QueryFilteringUtil'));
const Ws = use('Socket.IO');
const moment = use('moment');
const Antl = use('Antl');
const CustomString = use('App/Utils/CustomString');

class UserRepository {
  
  constructor(){
    const bindedDefaultFilterResolver = defaultWhereResolver.bind(this);
    const bindedMultipleFilterResolver = multipleWhereResolver.bind(this);
    const buildDefaultMultipleFilterEntry = (column) => ({
      resolver: bindedMultipleFilterResolver,
      column,
      parser: multipleFilterParser
    });

    this._filterOptionsColumnMap = {
      stateId: {resolver: bindedDefaultFilterResolver, column: 'st.id'},
      cityId: {resolver: bindedDefaultFilterResolver, column: 'cty.id'},
      office: {resolver: bindedDefaultFilterResolver, column: 'add.address'},

      coachIds: buildDefaultMultipleFilterEntry('v_users.coach_id'),
      regionalDirectorIds: buildDefaultMultipleFilterEntry('v_users.regional_id'),
      managerIds: buildDefaultMultipleFilterEntry('v_users.manager_id'),
      offices: buildDefaultMultipleFilterEntry('add.address')
    }
  }

  async listing(req, user) {
    const { limit, role_id = '', showInactive = false } = req;
    const roles_ids = role_id.length > 0 ?  role_id.split(',') : [];
    if (roles_ids.includes(userRoles.Admin)) {
      const userHasRole = await this.hasRole(user.id, userRoles.Admin);
      if (!userHasRole) {
        return {
          success: false,
          code: 403,
          isInactive: false,
          redirect: false,
          message: "You don't have the permission required to use the resource",
        };
      }
    }
    try {
      const query = Database.table('users');
      query
        .select([
          Database.raw('distinct(users.id)'), 
          'pi.full_name', 
          'users.email'
        ])
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .innerJoin('user_has_roles as urole', 'users.id', 'urole.user_id')
        

      if (roles_ids.length > 0) {
        query.whereIn('urole.role_id', roles_ids);
      }else{
        query.where('urole.role_id', '!=' , userRoles.Admin);
      }

      if(!showInactive){
        query.where('user_status_id', userStatus.Active);
      }

      query.orderBy('pi.full_name', 'asc');
      this.applyKeywordClause(req, query);
      const result = limit ? await query.limit(limit) : await query;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        code: 500,
        message: 'There was a problem retrieving the users',
      };
    }
  }

  async getDetails(id, extraParams = {}){
    let userDetails = null;
    const { customRelations = [], userHiddenFieldsToShow = [], hideUserAuditFields = true, customSelect = [] } = extraParams;
    const defaultRelation = {
      relation: 'personalInformation',
      extend: [{ method: 'select', params: ['id', 'first_name', 'last_name', 'full_name'] }],
    };

    const defaultSelect = [
      'id',
      'initials',
      'email',
      'personalInformation.full_name',
      'personalInformation.first_name',
      'personalInformation.last_name',
      ...userHiddenFieldsToShow
    ];
    const user = await User.query()
      .hideFields({ fields: userFields, hideAuditFields: hideUserAuditFields })
      .setVisibleHidden(userHiddenFieldsToShow)
      .include(customRelations.length > 0 ? [...customRelations] : [defaultRelation] )
      .where({ id })
      .first();
    if(user){
      userDetails = customSelect.length === 0 ? user.selectCustomMap(defaultSelect) : user.selectCustomMap(customSelect);
    }
    return userDetails;
  }

  /**
   * Return an array of emails from a group of users
   *
   * @param {Array} usersId
   */
  async userEmails(usersId) {
    const users = await Database.table('users')
      .select(['users.id', 'users.email', 'pi.first_name', 'pi.full_name'])
      .innerJoin('personal_informations as pi', 'pi.id', 'users.personal_information_id')
      .whereIn('users.id', usersId);

    return users;
  }

  /**
   * Returns the recruiters that are active, with their basic information
   *
   * @param {Array} usersId
   */
  async getAllActiveRecruiters() {
    const users = await User.query().where('users.user_status_id', userStatus.Active).fetch();
    return users.toJSON();
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  applyKeywordClause(req, query) {
    const { keyword } = req;
    if (keyword) {
      query.where(function () {
        this.where('pi.full_name', 'ilike', `%${keyword}%`);
      });
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  applyKeywordClauseRoster(keyword, query) {
    if (keyword) {
      query.where(function () {
        this.where('v_users.user_name', 'ilike', `%${keyword}%`)
          .orWhere('v_users.user_email', 'ilike', `%${keyword}%`)
          .orWhere('v_users.initials', 'ilike', `${keyword}`)
          .orWhere('v_users.job_title', 'ilike', `%${keyword}%`)
          .orWhere('v_users.manager_full_name', 'ilike', `%${keyword}%`);
      });
    }
  }

  async hasRole(user_id, role_id) {
    return await UserHasRole.query().where('user_id', user_id).where('role_id', role_id).first();
  }

  async hasPermission(user_id, permission_id) {
    return await UserHasPermission.query().where('user_id', user_id).where('permission_id', permission_id).first();
  }

  getInitials(name) {
    var initials = name.replace(/[^a-zA-Z- ]/g, '').match(/\b\w/g);
    return initials.join('').toUpperCase();
  }

  getColor(name) {
    const flatColors = flatten(colors);
    return flatColors[name.length];
  }

  /**
   * @summary Returns the users that are deemed for testing purposes, their email must be in the ENV const EMAILS_FOR_TESTING, e.g.: EMAILS_FOR_TESTING=kevin.velazquez@gogpac.com,cristopher.tovilla@gogpac.com,mario.moreno@gogpac.com
   *
   * @return {Object[]}
   */
  async getTestingUsers(){
    const emails = (Env.get('EMAILS_FOR_TESTING')).split(',')
    const users = await User.query().whereIn('email', emails).fetch();

    return users.toJSON();
  }

  async saveMicrosoftGraphToken(userId, accessToken, refreshToken, expiresIn) {
    const expiresOn = moment()
      .add(expiresIn - 60, 'seconds')
      .format(DateFormats.AgendaFormat);
    const encryptedAccessToken = Encryption.encrypt(accessToken)
    const encryptedRefreshToken = Encryption.encrypt(refreshToken)

    const microsoftGraphToken = await MicrosoftGraphToken.findOrCreate(
      { user_id: userId },
      { token: encryptedAccessToken, user_id: userId, refresh_token: encryptedRefreshToken, expires_on: expiresOn }
    );

    microsoftGraphToken.merge({ token: encryptedAccessToken, refresh_token: encryptedRefreshToken, expires_on: expiresOn});

    await microsoftGraphToken.save();
  }

  async saveMicrosoftGraphSubscriptionToken(userId, subscriptionId, expiresOn, { removeOldSubscription = true, resource }) {
    const MicrosoftGraph = new (use('App/Helpers/MicrosoftGraph'))();
    const microsoftGraphTokenFound = await MicrosoftGraphSubscription.query().where({ user_id: userId, resource }).first();

    if (microsoftGraphTokenFound) {
      if (removeOldSubscription) {
        await MicrosoftGraph.deleteMicrosoftGraphSubscription(userId, microsoftGraphTokenFound.subscription_id);
      }
      microsoftGraphTokenFound.merge({ subscription_id: subscriptionId, expires_on: expiresOn });
      await microsoftGraphTokenFound.save();
    } else {
      await MicrosoftGraphSubscription.create({
        subscription_id: subscriptionId,
        user_id: userId,
        expires_on: expiresOn,
        resource,
      });
    }
  }

  /**
   * Show a list of all users with their personal information, role and address
   *
   * @param {Request} ctx.request
   * @param {Object} User
   *
   * @return {Object} Roster list with a succes message or an error code
   *
   */
  async getRoster(user, filters, orders, optionsPag) {
    try {
      const { orderBy, direction } = orders;
      const { page, perPage } = optionsPag;

      const userId = user.id;
      const isCoach = await this.hasRole(userId, userRoles.Coach);
      const isRegionalDirector = await this.hasRole(userId, userRoles.RegionalDirector);

      const query = Database.table('v_users');
      const columns = [
        'v_users.id',
        'v_users.user_name as full_name',
        'v_users.manager_id',
        'v_users.manager_full_name as manager',
        'v_users.initials',
        'v_users.job_title as position',
        'ct.phone as phone',
        Database.raw("json_build_object('phone', coalesce(ct.phone, ct.ext), 'email', v_users.user_email) as communication_actions"),
        'ct.ext as extension',
        'v_users.user_email as email',
        Database.raw("(SELECT CASE WHEN add.city_id IS NOT NULL and add.address != 'Remote' THEN concat(cty.title,', ',st.slug)  ELSE 'Remote'  END) as location"),
        'st.title as state',
        'cty.title as city'
      ];

      if (isCoach || isRegionalDirector) {
        columns.push('ct.phone');
      }

      query.select(columns);

      query
        .innerJoin('personal_informations as pi', 'v_users.personal_information_id', 'pi.id')
        .innerJoin('contacts as ct', 'pi.contact_id', 'ct.id')
        .leftJoin('addresses as add', 'pi.address_id', 'add.id')
        .leftJoin('cities as cty', 'add.city_id', 'cty.id')
        .leftJoin('states as st', 'cty.state_id', 'st.id');

      // Only active users
      query.where('v_users.user_status_id', userStatus.Active);

      this.applyKeywordClauseRoster(filters.keyword, query);
      await this.applyWhereClause(filters, query);
      this.applyOrderClause(orderBy, direction, query);

      const result = await query.paginate(page ? page : 1, perPage ? perPage : 10);

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
        message: 'There was a problem retrieving the roster',
      };
    }
  }

  async getManagers(){
    try {
      const query = Database.table('v_users');
      const columns = [
        'v_users.id',
        'v_users.user_name as full_name',
        'v_users.initials',
        'v_users.job_title as position',
        'v_users.user_email as email'
      ];

      query.select(columns);
      query.whereRaw(`(SELECT count(*) FROM v_users as users_ref WHERE v_users.id = users_ref.manager_id) > 0`, []);
      
      query.orderBy('full_name', 'asc');

      const result = await query;

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
        message: 'There was a problem retrieving the managers',
      };
    }
  }

  /**
   * Apply the order clause on the query.
   *
   * @method applyOrderClause
   *
   * @param {String} orderBy
   * @param {String} direction
   * @param {Knex} query
   *
   */
  applyOrderClause(orderBy, direction, query) {
    const orderByParameter = orderBy ? orderBy : 'full_name';

    const validDirections = ['asc', 'desc'];
    const orderingOptions = [
      'id',
      'full_name',
      'initials',
      'manager',
      'position',
      'phone',
      'extension',
      'email',
      'location',
      'state',
      'city',
    ];

    const orderDirection = validDirections.find((dir) => dir === direction) || validDirections[0];
    const orderClause = orderingOptions.find((element) => element === orderByParameter);
    const secondaryOrderClause = orderClause === 'full_name' ? 'initials' : 'full_name'

    if (orderClause) {
      query.orderBy(orderClause, orderDirection);
      //This allows to have a secondary order by, e.g.: initials -> name
      query.orderBy(secondaryOrderClause, validDirections[0] ); //I think if this one is always asc, it will not cause confusion
    }
  }

  /**
   * Apply the where clause on the query.
   *
   * @method applyWhereClause
   *
   * @param {Request} ctx.request
   * @param {Knex} query
   *
   */
  async applyWhereClause(filters, query) {
    const filtersToEvaluate = Object.keys(filters);
    for(const keyFilter of filtersToEvaluate) {
      const filterMapEntry = this._filterOptionsColumnMap[keyFilter];
      if (!filterMapEntry) continue;
      const {resolver, column, parser} = filterMapEntry;
      const value = (parser instanceof Function) ? parser(filters[keyFilter]) : filters[keyFilter];
      if (!value || !(resolver instanceof Function)) continue;
      await resolver({query, column, value});
    }
  }

  async getCoachAndRegionalDirector(userId) {
    const isProductionDirector = await this.hasRole(userId, userRoles.ProductionDirector);
    const isRegionalDirector = await this.hasRole(userId, userRoles.RegionalDirector);
    if (isProductionDirector || isRegionalDirector) {
      return {regional_director_id: userId, coach_id: userId, success: true};
    }

    const isCoach = await this.hasRole(userId, userRoles.Coach);
    if (isCoach) {
      const recruiterHasIndustry = await RecruiterHasIndustry.query().where('coach_id', userId).first();
      if (!recruiterHasIndustry) {
        return {success: false};
      }
      const coach_id = recruiterHasIndustry.coach_id;
      const regional_director_id = recruiterHasIndustry.regional_director_id;
      return {regional_director_id, coach_id, success: true};
    }
    const isRecruiter = await this.hasRole(userId, userRoles.Recruiter);
    if (isRecruiter) {
      const recruiterHasIndustry = await RecruiterHasIndustry.query().where('recruiter_id', userId).first();
      if (!recruiterHasIndustry) {
        return {success: false};
      }
      const coach_id = recruiterHasIndustry.coach_id;
      const regional_director_id = recruiterHasIndustry.regional_director_id;
      return {regional_director_id, coach_id, success: true};
    }
    return {success: false};
  }

  async isRoleValidForRoster(roleId) {
    const rosterRoles = await ModulePresetsConfigRepository.getById('rosterRoles');

    if (!rosterRoles) {
      return false;
    }

    return rosterRoles.data.some((row) => row.id === Number(roleId));
  }

  async getOperationsTeamUsers() {
    const inQuery = Database.table('user_has_roles').select(['user_id']).where('role_id', userRoles.Operations);
    const users = await User.query().whereIn('id', inQuery).fetch();
    return users;
  }
  
  async getIndustries(userId){
    const isCoach = await this.hasRole(userId, userRoles.Coach);
    const industries = await Database.from('recruiter_has_industries as rhi')
      .select('itry.title')
      .innerJoin('industries as itry','rhi.industry_id','itry.id')
      .where(isCoach ? 'coach_id' : 'recruiter_id',userId)
      .distinct('itry.id')
    return industries
  }

  buildTokenByUserIdAndAgentQuery(userId, userAgent, referer) {
    const query = Database.table('tokens')
      .select(['tokens.user_id', 'tokens.id', 'token', 'type'])
      .innerJoin('tokens_meta as meta', 'meta.token_id', 'tokens.id')
      .where('tokens.user_id', userId)
      .where('user_agent', userAgent)
      .where('is_revoked', false)
      .where('type', 'jwt_refresh_token');
    
    !isNil(referer) && query.where('referer', referer);
    return query;
  }

  async getTokenByUserIdAndAgent(userId, userAgent, referer) {
    const query = this.buildTokenByUserIdAndAgentQuery(userId, userAgent, referer);
    return await query.first();
  }

  async canUseRefreshToken(encryptedToken, userId, userAgent, referer) {
    const query = this.buildTokenByUserIdAndAgentQuery(userId, userAgent, referer);
    query.where('token', Encryption.decrypt(encryptedToken))

    return !!(await query.first());
  }

  async deleteTokenByUserIdAndAgent(userId, userAgent, referer) {
    const token = await this.getTokenByUserIdAndAgent(userId, userAgent, referer);

    if(!token) return;

    await TokenMeta.query().where('token_id', token.id).delete();
    await Token.query().where('id', token.id).delete();
  }

  async getTokenIdByEncryptedToken(encryptedToken) {
    const token = await Token.findBy('token', Encryption.decrypt(encryptedToken));
    const tokenJson = token && token.toJSON();

    return tokenJson && tokenJson.id;
  }

  async saveTokenMeta(tokenMeta) {
    const { tokenId, userId, userAgent, referer } = tokenMeta;
    const meta = await TokenMeta.create({
      token_id: tokenId,
      user_id: userId,
      user_agent: userAgent,
      referer,
    });
    return meta;
  }
  

  /**
  *Returns returns User model instance corresponding to the Regional Director of the coach indicated by the coachId parameter
  *@summary 
  *@param {Number} coachId - Id of the coach that we want to know his Regional Director.
*/
  async getRegionalDirectorByCoachId(coachId) {
    const {hasAtLeastOne} = await this.hasRoles(coachId, [userRoles.RegionalDirector]);
    const baseQuery = User
      .query()
      .with('personalInformation');
    if (hasAtLeastOne) return await baseQuery.where('id', coachId).first();

    return baseQuery.whereRaw('id in (select distinct(regional_director_id) from recruiter_has_industries where coach_id = ? )', [coachId])
            .first();
  } 
/**
  *Returns whether the user checks one role passed & which ones does he/she has
  *@summary For a quick role checking, this method can be used in any part, it returns an object with the neccesary information about the user passed & his roles
  *@param {Number} userId - The user that the roles will be searched on
  *@param {Number[]} rolesToCheckInput - An array of the roles expected to find
  *@return {Object} The use role response - { hasAtLeastOne, assignedRoles}, where hasAtLeastOne is a boolean for quick validation of at least one role passed & assignedRoles is an array of the roles he has
*/
  async hasRoles(userId, rolesToCheckInput) {
    const rolesToCheck = Array.isArray(rolesToCheckInput) ? rolesToCheckInput : [rolesToCheckInput];
    const rolesSelection = await Database.table('user_has_roles')
      .select('role_id')
      .where('user_id', userId)
      .whereIn('role_id', rolesToCheck);
    return { hasAtLeastOne: rolesSelection.length > 0, assignedRoles: Array.from(new Set(rolesSelection.map(({role_id}) => Number(role_id))))};
  }


  /**
   * Returns a custom response with all the related user fields including Roles, Permissions and the Email Signature
   * This method is an extend of the user details and its used for the Admin Site Management
   *
   * @method getBasicInfo {This should be called getFullInfo istead as I'm seeing all the relations included, maybe a TODO}
   *
   * @param {Integer} userId 
   *
   * @return {Object} A success with a code 200 and data or a message error with an error code
   *
   */
  async getBasicInfo(userId) {
    try {
      const select = [
        'id',
        'email',
        'initials',
        'job_title',
        'manager_id',
        'manager.personalInformation.full_name as manager',
        'channelPartner.referral_id as channel_id',
        'channelPartner.referralUser.personalInformation.full_name as channel_partner',
        'email_signature',
        'start_date',
        'timezone',
        'personalInformation.full_name',
        'personalInformation.first_name',
        'personalInformation.last_name',
        'personalInformation.contact.ext as extension',
        'personalInformation.address.id as address_id',
        'personalInformation.address.city.title as city',
        'status.id as user_status_id',
        'status.title as user_status_title',
        'roles',
        'permissions'
      ];
      const relations = [
        { relation: 'personalInformation', load: [ { relation: 'contact' }, { relation: 'address.city' } ] },
        { relation: 'status' },
        { relation: 'roles.role'},
        { relation: 'permissions'},
        { relation: 'channelPartner.referralUser.personalInformation'},
        { relation: 'manager.personalInformation' }
      ]
      const user = await this.getDetails(userId, { customSelect: select, customRelations: relations, userHiddenFieldsToShow: ['email_signature'] })
      if(find(user.roles, { role_id: userRoles.Coach })){
        const team = await Team.findBy('coach_id', userId);
        const { email } = team || {};
        user.team_email = email;
      }
      user.roles = user.roles.map((val) => val.role);
      return {
        success: true,
        code: 200,
        data: user
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem retrieving the roster',
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the creation  of an user
   *
   * @method create
   *
   * @param {Object} userData {initials, first_name, last_name, phone, extension, status, address, zip, job_title, roles}
   * @param {Transaction} extTransaction 
   * @param {Integer} userAuthId 
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async create(userData, extTransaction, userAuthId) {
    try {
      const {
        email,
        initials,
        first_name,
        last_name,
        phone,
        extension,
        roles = [],
        permissions = [],
        status,
        address,
        zip,
        job_title,
        manager_id,
        channel_id,
        email_signature,
        start_date,
        timezone
      } = userData;
      const trx = extTransaction || (await Database.beginTransaction());
      const address_data = await this.getCustomAddress(address, zip);

      const contact = await Contact.create({ phone, ext: extension }, trx);
      const personalInformation = await PersonalInformation.create(
        {
          first_name,
          last_name,
          contact_id: contact.id,
          address_id: address_data.id,
          created_by: userAuthId,
          updated_by: userAuthId
        },
        trx
      );
      const user = await User.create(
        {
          email,
          initials,
          personal_information_id: personalInformation.id,
          user_status_id: status || userStatus.Active,
          job_title,
          created_by: userAuthId,
          updated_by: userAuthId,
          manager_id,
          email_signature,
          start_date,
          timezone
        },
        trx
      );
      const rolesToInsert = [];
      if(roles.length > 0){
        for(const role of roles){
          rolesToInsert.push({
            role_id: role.id,
            user_id: user.id
          })
        }
      }else{
        rolesToInsert.push({
          role_id: userRoles.Recruiter,
          user_id: user.id,
        })
      }
      await UserHasRole.createMany(rolesToInsert, trx);
      if(channel_id){
        await ChannelPartner.create({
          referee_id: user.id,
          referral_id: channel_id
        },trx);
      }
      if(permissions.length > 0){
        const permissionsToInsert = [];
        for(const permission of permissions){
          permissionsToInsert.push({
            permission_id: permission.id,
            user_id: user.id
          })
        }
        await UserHasPermission.createMany(permissionsToInsert, trx);
      }
      if(!extTransaction){
        await trx.commit();
        return {
          success: true,
          message: 'User created successfully',
          code: 201,
          data: user,
        };
      }
      return { success: true , userId: user.id };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      !extTransaction && trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        error,
        message: 'There was a problem creating the user, please try again later!',
      };
    }
  }

  async getUserIdsBySubscriptionIds(subscriptionIds) {
    const subscriptions = await MicrosoftGraphSubscription.query().whereIn('subscription_id', subscriptionIds).fetch();

    return subscriptions.toJSON().map(({ user_id }) => user_id);
  }

  async getExpiredGraphSubscriptions() {
    const expiredSubscriptions = await MicrosoftGraphSubscription.query().where('expires_on', '<=', 'now()').fetch();

    return expiredSubscriptions.toJSON();
  }

  /**
   * Obtain the microsoft graph subscriptions that are about to be expired
   *
   * @param {Number} hours - The hours that will allow to get the 'about' to expire subs, meanning those that are between now & now + 'hours'
   *
   * @return An object with a success attribute & the data or error attribute, depending on the outcome
   */
   async getAboutToExpireSubscriptions(hours = 13) {
    try {
      const aboutToExpireSubscriptions = await MicrosoftGraphSubscription.query()
        .whereRaw(`expires_on between now() and (now() + INTERVAL '${hours} HOUR')`)
        .fetch();

      return { success: true, data: aboutToExpireSubscriptions.toJSON() };
    } catch (error) {
      return {
        success: false,
        error,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'about to expire subscriptions',
        }),
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the saved changes of an user
   *
   * @method update
   *
   * @param {Object} user 
   * @param {Object} userData {initials, first_name, last_name, phone, extension, status, address, zip, job_title, roles}
   * @param {Transaction} extTransaction 
   * @param {Integer} userAuthId 
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async update(user, userData, extTransaction, userAuthId) {
    try {
      const {
        initials,
        first_name,
        last_name,
        phone,
        extension,
        status,
        address,
        zip,
        job_title,
        roles = [],
        permissions = [],
        manager_id,
        channel_id,
        email_signature,
        start_date,
        timezone,
        email
      } = userData;
      const trx = extTransaction || (await Database.beginTransaction());

      const personalInformation = await user.personalInformation().fetch();
      const contact = await personalInformation.contact().fetch();
      const address_data = await this.getCustomAddress(address, zip);
  
      await contact.merge(
        {
          phone,
          ext: extension,
        }
      );
      await contact.save(trx);
  
      await personalInformation.merge(
        {
          first_name,
          last_name,
          address_id: address_data.id,
          updated_by: userAuthId
        }
      );
      await personalInformation.save(trx);
      if(roles.length > 0){
        await trx.table('user_has_roles').where('user_id',user.id).delete();
        const rolesToInsert = [];
        for(const role of roles){
          rolesToInsert.push({
            role_id: role.id,
            user_id: user.id
          })
        }
        await UserHasRole.createMany(rolesToInsert, trx);
      }
      if(permissions.length > 0){
        await trx.table('user_has_permissions').where('user_id',user.id).delete();
        const permissionsToInsert = [];
        for(const permission of permissions){
          permissionsToInsert.push({
            permission_id: permission.id,
            user_id: user.id
          })
        }
        await UserHasPermission.createMany(permissionsToInsert, trx);
      }
      if(channel_id){
        const channelExist = await ChannelPartner.findBy('referee_id',user.id);
        if(channelExist){
          channelExist.merge({ referral_id : channel_id });
          await channelExist.save(trx);
        }else{
          await ChannelPartner.create({
            referee_id: user.id,
            referral_id: channel_id
          },trx);
        }
      }else{
        await trx.table('channel_partners').where('referee_id',user.id).delete();
      }
      await user.merge(
        {
          initials,
          user_status_id: status || userStatus.Active,
          job_title,
          updated_by: userAuthId,
          manager_id,
          email_signature,
          start_date,
          timezone,
          email
        }
      );
      await user.save(trx);
      if(!extTransaction){
        await trx.commit();
        return {
          success: true,
          message: 'User updated successfully',
          code: 201,
          data: user,
        };
      }
      return { success: true, userId: user.id };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      !extTransaction && trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        error,
        message: 'There was a problem updating the user, please try again later!',
      };
    }
  }

  async getCustomAddress(address, zip){
    const query =  Address.query();
    query.where('address',address || default_address);
    (address === 'Remote' && !zip) ? query.whereRaw('city_id is null') : query.where('zip',zip || default_zip);
    return await query.first()
  }

  async refreshUsersView(){
    await Database.raw(`select fp_refresh_v_users()`);
  }

  async getUsersByRole(role_id) {
    const inQuery = Database.table('user_has_roles').select(['user_id']).where('role_id', role_id);
    const users = await User.query().whereIn('id', inQuery).fetch();
    return users;
  }

  async logChange(userId, entity, operation, payload, authUserId) {
    try {
      await UserChangeLog.create({
        user_id: userId,
        entity,
        operation,
        payload,
        created_by: authUserId,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async broadcastLog(data) { 
    if(!Ws.io) return;

    try {
      const socket = Ws.io.of(WebSocketNamespaces.UserChanges);
      socket && socket.emit('message', data);
    } catch (error) {
      appInsights.defaultClient.trackEvent({ name: 'Socket Error', properties: { data, error } });
    }
  }

  async moveUserItemsToOffice(userId, coachTeamId, extTransaction){
    const  teamResult = await this.findOrCreateTeamCoach({ userId : coachTeamId, extTransaction });
    if(!teamResult.success){
      throw new Error(teamResult.error);
    }
    const { office_user_id  } = teamResult.data;
    const { data: { apiEmail } = {} } = await ModulePresetsConfigRepository.getById('system');
    const { id : apiUserId = null } = await User.findBy('email', apiEmail);
    const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
    const canResult = await CandidateRepository.changeOwnershipItems(userId, office_user_id, apiUserId, extTransaction);
    if(!canResult.success){
      throw new Error(canResult.error);
    }
    const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
    const joResult = await JobOrderRepository.changeOwnershipItems(userId, office_user_id, apiUserId, extTransaction);
    if(!joResult.success){
      throw new Error(joResult.error);
    }
    const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
    const cpResult = await CompanyRepository.changeOwnershipItems(userId, office_user_id, apiUserId, extTransaction);
    if(!cpResult.success){
      throw new Error(cpResult.error);
    }
    if(canResult.wereItemsMoved || joResult.wereItemsMoved || cpResult.wereItemsMoved){
      return {
        wereItemsMoved: true,
        candidateIds: canResult.ids
      }
    }
    return {
      wereItemsMoved: false
    }
  }


  async findOrCreateTeamCoach({ userId = null, teamEmail = null, extTransaction = null, userData = {} }){
    let trx;
    try {
      let teamData = await Team.findBy('coach_id',userId);
      if(teamData && teamData.office_user_id){
        return {
          success: true,
          data: teamData
        };
      }
      if(!(!find(userData.roles, { id: userRoles.Coach })) && !await this.hasRole(userId, userRoles.Coach)){
        throw new Error("The user provided is not a coach.");
      }
      const { data: { apiEmail } = {} } = await ModulePresetsConfigRepository.getById('system');
      const { id : apiUserId = null } = await User.findBy('email', apiEmail);
      const coach = isEmpty(userData) ? await this.getDetails(userId) : userData;
      const officeEmail = `${coach.email.split('@')[0]}@office.com`;
      trx = extTransaction || (await Database.beginTransaction());
      const officeCreationResult = await this.create(
        {
          email: officeEmail,
          first_name: 'Gpac Office',
          last_name: `Team ${coach.first_name}`,
          address: 'Remote',
          job_title: 'Office',
          initials: 'OFFICE'
        },
        trx,
        apiUserId
      );
      const { success, userId : officeUserId = null } = officeCreationResult;
      if(!success){
        throw new Error(officeCreationResult.error);
      }

      const { regional_director_id } = await this.getCoachAndRegionalDirector(userId);
      if(!teamData){
        teamData = await Team.create({
          regional_director_id,
          coach_id: userId,
          email: teamEmail || `team${coach.email.split('@')[0]}@gogpac.com`,
          office_user_id: officeUserId
        }, trx);
      }else{
        teamData.office_user_id = officeUserId;
        await teamData.save(trx);
      }
      await trx.insert({
        coach_id: userId,
        recruiter_id: officeUserId,
        regional_director_id
      }).into('recruiter_has_industries');

      if(!extTransaction){
        await trx.commit();
        return {
          success: true,
          data: teamData
        };
      }
      return { success: true,   data: teamData };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      !extTransaction && trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        error: error.toString()
      };
    }
  }

  async isOfficeUser(userId){
    if(!userId) return false;
    const exist = await Team.query().where('office_user_id',userId).first();
    return !!exist;
  }

  containsOfficeSubstring(str){
    if(!str) return false;
    return CustomString(str).toCompare().includes('office');
  }

}

module.exports = UserRepository;
