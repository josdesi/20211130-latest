'use strict'
const BaseValidator = use('./BaseValidator');

class UpdateJobOrder extends BaseValidator{
  get rules() {
    return {
      // validation rules company
      company_id: 'required|integer',
      industry_id: 'integer',
      position_id: 'required|integer',
      title: 'required|string',
      source: 'max:1024|customUrl',
      job_order_source_type_id: 'required|integer',
      different_location: 'required|integer',
      zip: 'max:8|existsFd:zip_codes,zip_ch',
      city_id: 'required_when,different_location,1|integer|existsFd:cities,id',
      start_date: 'date',
      specialty_id:'required|integer',
      subspecialty_id:'integer',
    };
  }

  get messages() {
    return {
      'company_id.required': 'Company is required',
      'industry_id.required': 'Industry is required',
      'position_id.required': 'Position is required',

      'title.required': 'Title job order is required',
      'source.required':'Source is required',

      'zip.existsFd': 'ZipCode not valid',
      'city_id.required': 'City is required',
      'city_id.existsFd': 'City not Valid',

      'different_location.required': 'DifferentLocation is required',
      'different_location.boolean': 'DifferentLocation should be boolean'
    };
  }

 
}

module.exports = UpdateJobOrder
