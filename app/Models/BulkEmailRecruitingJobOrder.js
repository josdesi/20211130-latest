'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class BulkEmailRecruitingJobOrder extends Model {
  jobOrders() {
    return this.hasMany('App/Models/JobOrder', 'job_order_id', 'id');
  }
}

module.exports = BulkEmailRecruitingJobOrder;
