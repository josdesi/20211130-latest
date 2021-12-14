'use strict';

const BaseValidator = use('./BaseValidator');
const Antl = use('Antl');

class DeleteEmailTrackingBlock extends BaseValidator {
  get rules() {
    return {
      id: 'required|existsFd:email_tracking_block_lists,id',
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;
    return Object.assign({}, requestBody, { id });
  }

  get messages() {
    return {
      'id.required': Antl.formatMessage('messages.validation.required', { field: 'id' }),
      'id.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'block rule' }),
    };
  }
}

module.exports = DeleteEmailTrackingBlock;
