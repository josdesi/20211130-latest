'use strict'

class LinkCandidateWithJobOrdeer {
  get rules() {
    return {
      // validation rules
      id: 'required|integer',
      candidateId: 'required_when:jobOrderId,null|integer|existsFd:candidates,id',
      jobOrderId: 'required_when:candidateId,null|integer|existsFd:job_orders,id',
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;

    return Object.assign({}, requestBody, { id });
  }

  get messages() {
    return {
      'id.integer': 'The Item Identifier should be an integer number',
      'candidateId.integer': 'The Candidate type should be an integer number',
      'jobOrderId.integer': 'The  Job Order type should be an integer number',
      'candidateId.required_when': 'The Candidate Identifier is required to link the items',
      'jobOrderId.required_when': 'The Job Order Identifier is required to link the items',
      'candidateId.existsFd': 'The Candidate not exist on the system',
      'jobOrderId.existsFd': 'The  Job Order not exist on the system',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = LinkCandidateWithJobOrdeer
