'use strict'
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const appInsights = require('applicationinsights');
class RecruiterController {
  async byCoach({request, response}) {
    const { coachId } = request.all();
    try {
      return await RecruiterRepository.recruitersByCoach(coachId);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the recruiters'
      });
    }
  }

  async myTeam({auth, response}) {
    const user_id = auth.current.user.id
    try {
      return await RecruiterRepository.recruitersFromUserTeam(user_id);      
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the recruiters'
      });
    }
  }

  async myTeamAndIndustry({auth, response}) {
    try {
      return await RecruiterRepository.recruitersByTeamAndSameIndustry(auth.current.user.id);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the recruiters'
      });
    }
  }
}

module.exports = RecruiterController
