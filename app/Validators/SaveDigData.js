'use strict';

const BaseValidator = use('./BaseValidator');
const Antl = use('Antl');
const { userRoles } = use('App/Helpers/Globals');
const { find, get } = use('lodash');
const { rule } = require('indicative');
class SaveDigData extends BaseValidator {
  isCoach = false;
  userId;

  get data() {
    const requestBody = this.ctx.request.all();
    const { dig, user } = requestBody;
    const extraParams = {};

    if(user){
      this.userId = user.id;
      if (
        dig &&
        dig.data &&
        dig.data.length > 0 &&
        !find(user.roles, { id: userRoles.RegionalDirector }) &&
        !find(user.roles, { id: userRoles.Coach })
      ) {
        extraParams.haveDigData = true;
      }
      if (user.roles && !!find(user.roles, { id: userRoles.Coach })) {
        this.isCoach = true;
        extraParams.isCoach = true;
      }
    }
    return Object.assign({}, requestBody, extraParams);
  }

  get rules() {
    return {
      //User Fields
      user: 'required',
      'user.first_name': 'required|max:128',
      'user.last_name': 'required|max:128',
      'user.email': `required|max:64|${this.userId ? `uniqueCaseInsensitive:users,email,id,${this.userId}` : 'uniqueCaseInsensitive:users,email'}`,
      'user.initials': 'max:15',
      'user.job_title': 'max:50',
      'user.start_date': [rule('required'), rule('dateFormat', 'YYYY-MM-DDTHH:mm:ss.SSSZ')],
      'user.extension': 'max:64',
      'user.status': `required`,
      'user.manager_id': 'required|integer',
      'user.roles': 'required|array',
      'user.permissions': 'array',

      'user.teamEmail': this.isCoach
        ? `required|uniqueIfCaseInsensitive:teams,email,isCoach${this.userId ? `,coach_id,${this.userId}` : ''}`
        : `string`,

      //Dig Fields
      dig: 'required',
      'dig.coach_id': 'required_if:haveDigData',
    };
  }

  get messages() {
    return {
      'user.first_name.required': Antl.formatMessage('messages.validation.required', { field: 'first name' }),
      'user.first_name.max': Antl.formatMessage('messages.validation.max', {
        field: 'first name',
        size: '{{ argument.0 }}',
      }),

      'user.last_name.required': Antl.formatMessage('messages.validation.required', { field: 'last name' }),
      'user.last_name.max': Antl.formatMessage('messages.validation.max', {
        field: 'last name',
        size: '{{ argument.0 }}',
      }),

      'user.email.required': Antl.formatMessage('messages.validation.required', { field: 'email' }),
      'user.email.max': Antl.formatMessage('messages.validation.max', { field: 'email', size: '{{ argument.0 }}' }),
      'user.email.uniqueCaseInsensitive': (field) => {
        return Antl.formatMessage('messages.validation.unique', { field: 'email', value: get(this.body, field) });
      },

      'user.initials.max': Antl.formatMessage('messages.validation.max', {
        field: 'initials',
        size: '{{ argument.0 }}',
      }),

      'user.job_title.max': Antl.formatMessage('messages.validation.max', {
        field: 'job_title',
        size: '{{ argument.0 }}',
      }),

      'user.start_date.required': Antl.formatMessage('messages.validation.required', { field: 'start date' }),
      'user.start_date.dateFormat': Antl.formatMessage('messages.validation.format', {
        field: 'start date',
        format: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      }),

      'user.extension.max': Antl.formatMessage('messages.validation.max', {
        field: 'extension',
        size: '{{ argument.0 }}',
      }),

      'user.status.required': Antl.formatMessage('messages.validation.required', {
        field: 'user status',
      }),

      'user.manager_id.required': Antl.formatMessage('messages.validation.required', { field: 'manager' }),
      'user.manager_id.integer': Antl.formatMessage('messages.validation.type', {
        field: 'manager',
        type: 'number',
      }),

      'user.roles.required': Antl.formatMessage('messages.validation.required', { field: 'user roles' }),
      'user.roles.array': Antl.formatMessage('messages.validation.type', {
        field: 'user roles',
        type: 'array',
      }),

      'user.permissions.array': Antl.formatMessage('messages.validation.type', {
        field: 'user permissions',
        type: 'array',
      }),

      'user.teamEmail.required': Antl.formatMessage('messages.validation.required', { field: 'team email' }),
      'user.teamEmail.uniqueIfCaseInsensitive': (field, validation, args) => {
        return Antl.formatMessage('messages.validation.unique', { field: 'team email', value: get(this.body, field) });
      },
      'user.teamEmail.max': Antl.formatMessage('messages.validation.max', {
        field: 'team email',
        size: '{{ argument.0 }}',
      }),

      'dig.coach_id.required_if': Antl.formatMessage('messages.validation.required', { field: 'coach' }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages[0]);
  }
}

module.exports = SaveDigData;
