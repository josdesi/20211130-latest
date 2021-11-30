'use strict'

const BaseValidator = use('./BaseValidator');
const Antl = use('Antl');
const { get } = use('lodash');

class UpdateIndustry extends BaseValidator {
  get rules () {
    const industryId = this.ctx.params.id

    return {
      // validation rules
      title: `required|uniqueCaseInsensitive:industries,title,id,${industryId}`,
      specialties: 'array',
      'specialties.*.title': 'required',
      'specialties.*.subspecialties': 'array',
      'specialties.*.positions': 'array',
      'specialties.*.subspecialties.*.title': 'required',
      'specialties.*.positions.*.title': 'required',
    }
  }

  get messages() {
    return {
      'title.required': Antl.formatMessage('messages.validation.required', { field: 'title' }),
      'title.uniqueCaseInsensitive': (field) => {
        return Antl.formatMessage('messages.validation.unique', { field: 'title', value: get(this.body, field) });
      },
      'specialties.array': Antl.formatMessage('messages.validation.type', {
        field: 'specialties',
        type: 'array',
      }),

      'specialties.*.subspecialties': Antl.formatMessage('messages.validation.type', {
        field: 'subspecialties',
        type: 'array',
      }),
      'specialties.*.positions': Antl.formatMessage('messages.validation.type', {
        field: 'positions',
        type: 'array',
      }),
      'specialties.*.subspecialties.*.title': Antl.formatMessage('messages.validation.required', {
        field: 'subspecialty title',
      }),
      'specialties.*.positions.*.title': Antl.formatMessage('messages.validation.required', {
        field: 'position title',
      }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages[0]);
  }
}

module.exports = UpdateIndustry
