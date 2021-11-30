'use strict'

const BaseValidator = use('./BaseValidator');
const Antl = use('Antl');

class SaveCommonPosition extends BaseValidator {
  get rules () {
    return {
      // validation rules
      updated: 'array',
      'updated.*.title': 'required',
      'updated.*.id': 'required',
      deleted: 'array',
      'deleted.*.title': 'required',
      'deleted.*.id': 'required',
      added: 'array',
      'added.*.title': 'required',
    }
  }

  get messages () {
    return {
      // validation rules
      'updated.array': Antl.formatMessage('messages.validation.type', {
        field: 'updated values',
        type: 'array',
      }),
      'updated.*.title': Antl.formatMessage('messages.validation.required', { field: 'updated title' }),
      'updated.*.id': Antl.formatMessage('messages.validation.required', { field: 'updated key' }),

      'deleted.array': Antl.formatMessage('messages.validation.type', {
        field: 'deleted values',
        type: 'array',
      }),
      'deleted.*.title': Antl.formatMessage('messages.validation.required', { field: 'deleted title' }),
      'deleted.*.id': Antl.formatMessage('messages.validation.required', { field: 'deleted key' }),

      'added.array': Antl.formatMessage('messages.validation.type', {
        field: 'added values',
        type: 'array',
      }),
      'added.*.title': Antl.formatMessage('messages.validation.required', { field: 'added title' }),

    }
  }
}

module.exports = SaveCommonPosition
