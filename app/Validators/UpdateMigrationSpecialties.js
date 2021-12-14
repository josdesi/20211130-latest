'use strict'

class UpdateMigrationSpecialties {
  get rules () {
    return {
      // validation rules
      'industries_mapping':'required',
      'industries_mapping.*.industry':'required|string',
      'industries_mapping.*.specialty_id':'required|integer',
      'industries_mapping.*.subspecialty_id':'integer',
    }
  }

  get messages() {
    return {
      'industries_mapping.required':'A Field is missing on the request, contact support to validate it',
      
      'industries_mapping.*.specialty_id.integer':'Only Integers are allowed',
      'industries_mapping.*.subspecialty_id.integer':'Only Integers are allowed',
    }
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateMigrationSpecialties
