'use strict'

class GetPlacement {
  get rules () {
    return {
      // validation rules
      relations: 'array'
    }
  }

  get data() {
    const requestBody = this.ctx.request.all();
    requestBody.relations = this.ctx.request.input('relations')
      ? this.ctx.request.input('relations').split(',').map((val) => {
          return {
            relation: val
          }
       })
      : [];

    return Object.assign({}, requestBody);
  }
}

module.exports = GetPlacement
