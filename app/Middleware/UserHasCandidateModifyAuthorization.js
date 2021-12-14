'use strict';
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Models
const Candidate = use('App/Models/Candidate');
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();

class UserHasCandidateModifyAuthorization {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle({ auth, response, request, params }, next) {
    try {
      const userId = auth.current.user.id;
      const candidateId = Number(params.id); //Perhaps checks first candidates/:id/ & next a candidate_id in the body: params.id ? Number(params.id) : request.input('candidate_id')

      const candidate = await Candidate.find(candidateId);
      if (!candidate) {
        return response.status(404).send({
          message: 'Candidate not found',
          redirect: false,
        });
      }

      const candidateBelongsRecruiter = await CandidateRepository.isARecruiterAssigned(candidateId, userId);

      if (!candidateBelongsRecruiter) {
        return response.status(403).send({
          message: 'You cannot modify the candidate',
          redirect: false,
        });
      }

      // call next to advance the request
      await next();
    } catch (error) {
      return response.status(500).send({
        message: 'Something went wrong while validating the candidate-recruiter authorization',
        redirect: false,
      });
    }
  }
}

module.exports = UserHasCandidateModifyAuthorization;
