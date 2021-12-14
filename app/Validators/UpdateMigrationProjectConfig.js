'use strict'

class UpdateMigrationProjectConfig {
  get rules () {
    return {
      // validation rules
      'isPrivate':'required_without_any:searchProjectId|boolean',
      'name':'required_without_any:searchProjectId|string',
      'recruiterId':'required_without_any:searchProjectId|integer',

      'positions_mapping':'required',
      'positions_mapping.*.title':'required|string',
      'positions_mapping.*.id':'required|integer',
      'positions_mapping.*.specialty':'required',
      'positions_mapping.*.specialty.id':'required|integer',
      'positions_mapping.*.specialty.title':'required|string',
      'positions_mapping.*.specialty.industry':'required|string',
    }
  }

  get messages() {
    return {
      'positions_mapping.required':'A Field is missing on the request, contact support to validate it',
      'positions_mapping.*.id.integer':'Only Integers are allowed',
      'positions_mapping.*.specialty.id.integer':'Only Integers are allowed',
      'name.required_without_any':'A name is required',
      'recruiterId.required_without_any':'The recruiter was not selected'
    }
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateMigrationProjectConfig
