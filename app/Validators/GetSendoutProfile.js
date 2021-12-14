'use strict'

class GetSendoutProfile {
  get rules () {
    return {
      scopes: 'array',
      relations: 'array'
    };
  }

  
  get data() {
    const requestBody = this.ctx.request.all();
    requestBody.scopes = this.ctx.request.input('scopes')
      ? this.ctx.request.input('scopes').split(',').map((val) => {
          return {
            scope: val
          }
        })
      : [];
    requestBody.relations = this.ctx.request.input('relations')
      ? this.ctx.request.input('relations').split(',').map((val) => {
          return {
            relation: val
          }
       })
      : [];

    return Object.assign({}, requestBody);
  }

  get messages() {
    return {
      'scopes.array': 'The scopes passed must be an array type',
      'scopes.relations': 'The relations passed must be an array type'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetSendoutProfile
