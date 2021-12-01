'use strict'

class InventoryFilters {
  get rules () {
    return {
      // validation rules
      entityType : 'required|string',
      keyword : 'string',
      typeId : 'integer',
      industryId : 'integer',
      stateId : 'integer',
      cityId : 'integer',
      radius : 'integer',
      specialtyId : 'integer',
      subspecialtyId : 'integer',
      positionId : 'integer',
      coachId : 'integer',
      recruiterId : 'integer'

    }
  }

  get messages() {
    return {
      'entityType.string': 'An entityType is required',
      'industryId.integer': 'IndustryId should be an Integer',
      'stateId.integer': 'stateId should be an Integer',
      'cityId.integer': 'cityId should be an Integer',
      'radius.integer': 'radius should be an Integer',
      'specialtyId.integer': 'specialtyId should be an Integer',
      'subspecialtyId.integer': 'subspecialtyId should be an Integer',
      'coachId.integer': 'coachId should be an Integer',
      'recruiterId.integer': 'recruiterId should be an Integer',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = InventoryFilters
