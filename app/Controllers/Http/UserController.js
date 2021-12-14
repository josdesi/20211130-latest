'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
const appInsights = require('applicationinsights');
const speakeasy = require('speakeasy');
const axios = require('axios');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

const Env = use('Env');
const User = use('App/Models/User');
const UserHasRole = use('App/Models/UserHasRole');
const Role = use('App/Models/Role');
const UserStatus = use('App/Models/UserStatus');

const { userRoles, userStatus } = use('App/Helpers/Globals');
const { DateFormats, parseBoolean } = use('App/Helpers/Globals');
const Database = use('Database');
const PersonalInformation = use('App/Models/PersonalInformation');
const Contact = use('App/Models/Contact');
const Encryption = use('Encryption');
const userRepository = new (use('App/Helpers/UserRepository'))();
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const VerificationCode = use('App/Models/VerificationCode');

//Utils
const CodeEmail = new (use('App/Emails/CodeEmail'))();
const MicrosoftGraph = new (use('App/Helpers/MicrosoftGraph'))();
const Antl = use('Antl');
const moment = use('moment');

/**
 * Controller for interacting with user
 */
class UserController {
  /**
   * Signin.
   * POST
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @returns {object}
   */
  async signin({ request, response, auth }) {
    try {
      const code = request.input('code');

      //Legacy
      if(request.input('access_token')){
        return await this.legacySignin({ request, response, auth })
      }

      let params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('client_id', Env.get('OAUTH_APP_ID'));
      params.append('redirect_uri', Env.get('OAUTH_REDIRECT_URI'));
      params.append('client_secret', Env.get('OAUTH_APP_SECRET'));

      const loginResponse = await axios.post(Env.get('URL_LOGIN'), params);

      const { access_token, refresh_token, expires_in } = loginResponse.data;

      const axios_response = await axios.get(Env.get('URL_GRAPH'), {
        headers: {
          Authorization: 'Bearer ' + access_token,
        },
      });

      const { mail } = axios_response.data;
      let user = await User.query().whereRaw('LOWER(email)=?', [mail.toLowerCase()]).first();
      if (user == null) {
        const result = await this.storeUser(axios_response.data);
        if (!result.success) {
          return response.status(500).send({
            message: Antl.formatMessage('messages.error.user.errorCreation'),
          });
        }
        user = result.data;
      }
      if (user.user_status_id === userStatus.Inactive) {
        return response.status(403).send({
          message: Antl.formatMessage('messages.error.authorization'),
          isInactive: true,
          redirect: false,
        });
      }
      const userDetails = await this.details(user.id);
      if (!userDetails.success) {
        return response.status(404).send({
          message: Antl.formatMessage('messages.error.user.gettingUser'),
        });
      }
      const fullName = userDetails.data.personalInformation.full_name;
      userDetails.data.initials = userDetails.data.initials || userRepository.getInitials(fullName);
      userDetails.data.color = userRepository.getColor(fullName);

      await userRepository.saveMicrosoftGraphToken(user.id, access_token, refresh_token, expires_in);

      const userAgent = request.header('user-agent');
      const referer = request.header('referer');
      const refreshToken = await userRepository.getTokenByUserIdAndAgent(user.id, userAgent, referer);

      let token = null;
      if(refreshToken) {
        token = await auth.generate(user, { user: userDetails.data });
        token.refreshToken = Encryption.encrypt(refreshToken.token);
      } else {
        token = await auth.withRefreshToken().generate(user, { user: userDetails.data });
        const tokenId = await userRepository.getTokenIdByEncryptedToken(token.refreshToken);
        tokenId && await userRepository.saveTokenMeta({
          tokenId,
          userId: user.id, 
          userAgent, 
          referer
        });
      }

      Event.fire(EventTypes.User.LogedIn, { user });

      return response.status(200).send({
        token,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      if (error.hasOwnProperty('response') && error.response.status == 401) {
        return response.unauthorized({
          message: 'Login First',
        });
      }
      return response.status(500).send({
        message:  Antl.formatMessage('messages.error.user.errorLogin'),
      });
    }
  }

  /**
   * 
   * LEGACY CODE!
   * While some clients will still need this function, it should be phased out ASAP
   * 
   */
  async legacySignin({ request, response, auth }) {
    try {
      const access_token = request.input('access_token');

      const axios_response = await axios.get(Env.get('URL_GRAPH'), {
        headers: {
          Authorization: 'Bearer ' + access_token,
        },
      });
      const { mail } = axios_response.data;
      let user = await User.query().whereRaw('LOWER(email)=?', [mail.toLowerCase()]).first();
      if (user == null) {
        const result = await this.storeUser(axios_response.data);
        if (!result.success) {
          return response.status(500).send({
            message: 'Error During the User Creation',
          });
        }
        user = result.data;
      }
      if (user.user_status_id === userStatus.Inactive) {
        return response.status(403).send({
          message: "Your account doesn't have the permissions to use the resource",
          isInactive: true,
          redirect: false,
        });
      }
      const userDetails = await this.details(user.id);
      if (!userDetails.success) {
        return response.status(404).send({
          message: 'Error getting the User',
        });
      }
      const fullName = userDetails.data.personalInformation.full_name;
      userDetails.data.initials = userDetails.data.initials || userRepository.getInitials(fullName);
      userDetails.data.color = userRepository.getColor(fullName);

      const userAgent = request.header('user-agent');
      const referer = request.header('referer');
      const refreshToken = await userRepository.getTokenByUserIdAndAgent(user.id, userAgent, referer);

      let token = null;
      if(refreshToken) {
        token = await auth.generate(user, { user: userDetails.data });
        token.refreshToken = Encryption.encrypt(refreshToken.token);
      } else {
        token = await auth.withRefreshToken().generate(user, { user: userDetails.data });
        const tokenId = await userRepository.getTokenIdByEncryptedToken(token.refreshToken);
        tokenId && await userRepository.saveTokenMeta({
          tokenId,
          userId: user.id, 
          userAgent, 
          referer
        });
      }

      return response.status(200).send({
        token,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      if (error.hasOwnProperty('response') && error.response.status == 401) {
        return response.unauthorized({
          message: 'Login First',
        });
      }
      return response.status(500).send({
        message: 'There was a problem loggin into your account ,please try again later!',
      });
    }
  }

  /**
   * StoreUser.
   *
   * @param {object} mail
   * @param {jobTitle} jobTitle
   * @returns {object}
   */
  async storeUser(data) {
    const { mail, jobTitle, displayName, surname, givenName } = data;
    const trx = await Database.beginTransaction();
    const role = await Role.findBy('title', jobTitle);
    const role_id = role ? role.id : userRoles.Recruiter;
    const user_status = await UserStatus.findByOrFail('title', 'Active');
    try {
      const contact = await Contact.create({ personal_email: mail }, trx);
      const personalInformation = await PersonalInformation.create(
        {
          first_name: givenName,
          last_name: surname,
          full_name: displayName,
          contact_id: contact.id,
          address_id: 1, //Default Sioux Falls Direction ID
        },
        trx
      );
      const user = await User.create(
        {
          email: mail,
          user_status_id: user_status.id,
          personal_information_id: personalInformation.id,
        },
        trx
      );
      await UserHasRole.create(
        {
          user_id: user.id,
          role_id,
        },
        trx
      );
      await trx.commit();

      Event.fire(EventTypes.User.Created, { user });

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      trx.rollback();
      return {
        success: false,
      };
    }
  }

  /**
   * RefreshToken.
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @returns {object}
   */
  async refreshToken({ auth, request, response }) {
    try {
      const refreshToken = request.input('refresh_token');
      const userAgent = request.header('user-agent');
      const referer = request.header('referer');

      const header = await auth.getAuthHeader();
      const decodedHeader = Encryption.base64Decode(header.split('.')[1]);
      const jwtToken = JSON.parse(decodedHeader);

      const canUseRefreshToken = await userRepository.canUseRefreshToken(refreshToken, jwtToken.uid, userAgent, referer);
      if(!canUseRefreshToken) {
        return response.status(400).send({
          message: 'The Refresh Token is invalid',
        });
      }
      
      const userDetails = await this.details(jwtToken.uid);
      if (!userDetails.success) {
        return response.status(404).send({
          message: 'Error getting the User',
        });
      }
      const fullName = userDetails.data.personalInformation.full_name;
      if (userDetails.data.user_status_id === userStatus.Inactive) {
        return response.status(403).send({
          message: "Your account doesn't have the permissions to use the resource",
          isInactive: true,
          redirect: true,
        });
      }
      
      userDetails.data.initials = userDetails.data.initials || userRepository.getInitials(fullName);
      userDetails.data.color = userRepository.getColor(fullName);
      
      const token = await auth.generateForRefreshToken(refreshToken, { user: userDetails.data });
      return response.status(200).send({
        token,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      if (error.name == 'InvalidRefreshToken') {
        return response.status(400).send({
          message: 'The RefreshToken is invalid',
        });
      }

      return response.status(500).send({
        message: 'There was a problem generating the new token, please try again later!',
      });
    }
  }

  /**
   * Details.
   *
   *                              **DISCLAIMER**
   * This method should be used only to generate the data that will be contained on the user token,
   * if you are trying to get the user details for other porpuses check the getDetails on the
   * UserRepository
   * 
   * @param {var} id
   * @returns {object}
   */
  async details(id) {
    try {
      const relationsToAdd = [
        { relation: 'roles.role'},
        { relation: 'permissions'},
        { relation: 'status' },
        { relation: 'personalInformation'}
      ]
      const userHiddenFieldsToShow = ['avatar', 'double_authentication', 'step_wizard'];
      const user = await userRepository.getDetails(id, { customRelations: relationsToAdd, userHiddenFieldsToShow,  customSelect : ['*'] });
      return {
        success: true,
        data: user
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
      };
    }
  }

  /**
   * LogOut.
   * GET
   * @param {Request} ctx.auth
   * @param {Response} ctx.response
   * @returns {object}
   */
  async logout({ request, auth, response }) {
    try {
      const userAgent = request.header('user-agent');
      const referer = request.header('referer');
      const user = auth.current.user;
      await userRepository.deleteTokenByUserIdAndAgent(user.id, userAgent, referer);
      return response.send({
        success: true,
        message: 'LogOut Succesfully',
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem loggin out your account, please try again later!',
      });
    }
  }

  /**
   * Show a list of all users.
   * GET users
   *
   * @param {object} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ auth, request, response }) {
    const result = await userRepository.listing(request.all(), auth.current.user);
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

  /**
   * Show a roster of all users
   * GET roster
   *
   * @param {object} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async roster({ auth, request, response }) {
    const filters = request.only(
      [
        'roleId',
        'keyword',
        'office',
        'cityId',
        'stateId',
        'offices',
        'coachIds',
        'regionalDirectorIds',
        'managerIds'
      ]
    );
    const orders = request.only(['orderBy', 'direction']);
    const optionsPag = request.only(['page', 'perPage']);

    const result = await userRepository.getRoster(auth.current.user, filters, orders, optionsPag);

    return response.status(result.code).send(result.success ? result.data : result);
  }
  
  async managers({ response }) {
    const result = await userRepository.getManagers();
    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Signin to chrome extension.
   * POST
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @returns {object}
   */
  async generateVerificationCode({ request, response }) {
    try {
      const email = request.input('email');

      let user = await User.query().whereRaw('LOWER(email)=?', [email.toLowerCase()]).first();

      if (user == null) {
        return response.status(404).send({
          message: 'The email entered does not exist',
        });
      }

      await VerificationCode.query().where('email', email).delete();

      const code = speakeasy.totp({
        secret: Env.get('SPEAKEASY_KEY'),
        encoding: 'base32',
        digits: 5,
        step: Env.get('SPEAKEASY_REMAINING'),
        window: 0,
      });

      await VerificationCode.create({
        email: email,
        code: code,
      });

      const userDetails = await this.details(user.id);
      const fullName = userDetails.data.personalInformation.full_name;

      await CodeEmail.send(code, fullName, email);

      return response.status(200).send({
        message: 'Verification code sent. Please check again your mailbox',
      });
    } catch (error) {
      console.log({ error });
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem loggin into your account, please try again later!',
      });
    }
  }

  /**
   * Resend Verification Code.
   * POST
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @returns {object}
   */
  async resendVerificationCode({ request, response }) {
    try {
      const email = request.input('email');

      const user = await User.query().whereRaw('LOWER(email)=?', [email.toLowerCase()]).first();

      await VerificationCode.query().where('email', email).delete();

      const code = speakeasy.totp({
        secret: Env.get('SPEAKEASY_KEY'),
        encoding: 'base32',
        digits: 5,
        step: Env.get('SPEAKEASY_REMAINING'),
        window: 0,
      });

      await VerificationCode.create({
        email: email,
        code: code,
      });

      const userDetails = await this.details(user.id);
      const fullName = userDetails.data.personalInformation.full_name;

      await CodeEmail.send(code, fullName, email);

      return response.status(200).send({
        message: 'Verification code resent. Please check again your mailbox',
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem forwarding the verification code,please try again later!',
      });
    }
  }

  /**
   * Signin.
   * POST
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @returns {object}
   */
  async verifyVerificationCode({ request, response, auth }) {
    try {
      const { email, code } = request.all();

      const isValid = await VerificationCode.query().where('code', code).where('email', email).first();

      if (!isValid) {
        return response.status(403).send({
          message: 'Verification code is not valid',
        });
      }

      const isExpired = speakeasy.totp.verify({
        secret: Env.get('SPEAKEASY_KEY'),
        encoding: 'base32',
        token: code,
        digits: 5,
        step: Env.get('SPEAKEASY_REMAINING'),
        window: 0,
      });

      if (!isExpired) {
        return response.status(403).send({
          message: 'Verification code is expired',
        });
      }

      const user = await User.query().whereRaw('LOWER(email)=?', [email.toLowerCase()]).first();
      const userDetails = await this.details(user.id);

      if (!userDetails.success) {
        return response.status(403).send({
          message: 'Error getting the User',
        });
      }

      const fullName = userDetails.data.personalInformation.full_name;
      userDetails.data.initials = userDetails.data.initials || userRepository.getInitials(fullName);
      userDetails.data.color = userRepository.getColor(fullName);

      const token = await auth.withRefreshToken().generate(user, { user: userDetails.data });

      return response.status(200).send({
        token,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem loggin into your account, please try again later!',
      });
    }
  }

  /**
   *
   * GET offices
   *
   * @param {Response} ctx.response
   */
  async offices({ response }) {
    try {
      const result = await ModulePresetsConfigRepository.getById('rosterOffices');
      return response.status(200).send(result.data);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the data, please try again later!',
      });
    }
  }

  /**
   * Returns the basic profile info for an user
   *
   * @method profile
   * 
   * @param {object} ctx.
   * @param {Response} ctx.response
   *
   * 
   * @return {Object} Message or success or an error code
   */
  async basicInfo({ params ,response }) {
    const { id } = params;
    const result = await userRepository.getBasicInfo(id);
    return response.status(result.code).send(result.data || result);
  }

  async renewMicrosoftGraphSubscriptions({ response }) {
    try {
      const result = await userRepository.getAboutToExpireSubscriptions();
      if (!result.success) throw result.error;

      const renewSubscriptionPromise = result.data.map((subscription) =>
        MicrosoftGraph.renewMicrosoftGraphSubscription(subscription.subscription_id)
      );

      const renewals = await Promise.all(renewSubscriptionPromise);

      const failedRenewals = renewals.filter((renewal) => !renewal.success)

      Event.fire(EventTypes.User.GraphSubscriptionRenewed, { failedRenewals });

      return response.status(200).send();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send();
    }
  }

  async microsoftGraphWebhook({ request, response, auth }) {
    try {
      const data = request.all();

      const isOutlookTrackingEnabled = parseBoolean(Env.get('ENABLE_OUTLOOK_TRACKING', false));
      if (!isOutlookTrackingEnabled) return response.status(202).header('Content-type', 'text/plain').send();

      const validationToken = request.input('validationToken');
      if (validationToken) return response.status(200).header('Content-type', 'text/plain').send(validationToken);

      //A petition is an array of events
      for (const event of data.value) {
        if(event.clientState !== Env.get('CLIENT_STATE')){
          appInsights.defaultClient.trackEvent({
            name: 'Microsoft Graph Client State Verification Failure',
            properties: { data },
          });
          return response.status(403).header('Content-type', 'text/plain').send();
        }

        const nowDate = moment().format(DateFormats.AgendaFormat);
        const expirationDate = moment(event.subscriptionExpirationDateTime).subtract(1, 'day').format(DateFormats.AgendaFormat);

        if (expirationDate <= nowDate) {
          await MicrosoftGraph.renewMicrosoftGraphSubscription(event.subscriptionId); //Renew the subscription in case it is going to expire
        }

        const result = await MicrosoftGraph.getEmail(event.subscriptionId, event.resourceData.id);
        if (!result.success) {
          const properties = {
            ...result,
            payload: event,
          };
          appInsights.defaultClient.trackEvent({ name: 'Microsoft Graph Get Email Failed', properties });
          appInsights.defaultClient.trackException({ exception: result });
        }
      }

      return response.status(202).header('Content-type', 'text/plain').send();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).header('Content-type', 'text/plain').send();
    }
  }
  
  /**
   * Returns the statuses available for an user
   *
   * @method statuses
   * 
   * @param {object} ctx.
   * @param {Response} ctx.response
   * 
   * @return {Object} Data or an error code
   */
  async statuses({ response }) {
    try {
      const result = await UserStatus.all();
      return response.status(200).send(result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the statuses, please try again later!',
      });
    }
  }

  /**
   * Returns the timezones available for an user
   *
   * @method listingTimezones
   * 
   * @param {object} ctx.
   * @param {Response} ctx.response
   * 
   * @return {Object} Data or an error code
   */
  async listingTimezones({response}){
    try {
      const { data: timezones } = await ModulePresetsConfigRepository.getById('timezone');
      return response.status(200).send(timezones);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        success: false,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'Timezones' })
      });
    }
  }
}

module.exports = UserController;
