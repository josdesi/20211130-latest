//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Models
const User = use('App/Models/User');
const Team = use('App/Models/Team');

//Utils
const Database = use('Database');
const { userRoles, userPermissions, userStatus} = use('App/Helpers/Globals');

class RecruiterRepository {
  async applyDigFilters(user_id, query, industryClause, stateClause, includeStates) {
    const isCoach = await UserRepository.hasRole(user_id, userRoles.Coach);
    const subqueryIndustries = await Database.from('recruiter_has_industries')
      .where(isCoach ? 'coach_id' : 'recruiter_id', user_id)
      .distinct('industry_id');

    const whereInClauseIndustries = subqueryIndustries.map((recruiter) => recruiter.industry_id);
    query.whereIn(industryClause, whereInClauseIndustries);

    if (includeStates) {
      const subqueryStates = await Database.from('recruiter_has_industries')
        .where('recruiter_id', user_id)
        .distinct('state_id');
      const whereInClauseStates = subqueryStates.map((recruiter) => recruiter.state_id);
      query.whereIn(stateClause, whereInClauseStates);
    }
  }


  async recruiterOnTeam(user_id){
    let subqueryRecruiters
    const isRegionalDirector = await UserRepository.hasRole(user_id, userRoles.RegionalDirector);
    if(isRegionalDirector){
      subqueryRecruiters = await this.recruitersByUser(user_id,'regional_director_id');
    }else{
      const isCoach = await UserRepository.hasRole(user_id, userRoles.Coach);
      const coach_id = isCoach ? user_id : (await this.getCoachByRecruiterId(user_id));
      subqueryRecruiters = await this.recruitersByUser(coach_id,'coach_id');
      isCoach ? subqueryRecruiters.push({recruiter_id:coach_id}) : null
    }
    const whereInClauseRecruiters = subqueryRecruiters.map((recruiter) => Number(recruiter.recruiter_id));
    if(whereInClauseRecruiters.length === 0){
      return [user_id];
    }
    return whereInClauseRecruiters;
  }

  async coachesByRegion(regionalId){
    const  subqueryCoaches = await Database.from('recruiter_has_industries')
      .where('regional_director_id', regionalId)
      .distinct('coach_id');
    subqueryCoaches.push({coach_id:regionalId})
    const whereInClauseCoaches = subqueryCoaches.map((coach) => coach.coach_id);
    return whereInClauseCoaches
  }

  async recruitersByUser(user_id, column){
    return await Database.from('recruiter_has_industries')
      .where(column, user_id)
      .distinct('recruiter_id');
  }

  /**
   * Returns all the coaches at the moment in fortpac
   *
   * @summary Returns an array of objects that contains the coaches basic information
   *
   * @return {Array} coachesList
   */
  async getCoaches() {
    const coachesQuery = Database.from('recruiter_has_industries').select('coach_id').distinct();

    const result = (
      await User.query()
        .select('users.*')
        .with('personalInformation')
        .innerJoin('personal_informations as pi', 'pi.id', 'users.personal_information_id')
        .orderBy('pi.full_name', 'asc')
        .whereIn('users.id', coachesQuery)
        .fetch()
    ).toJSON();

    return result;
  }

  /**
   * Returns all the regionals at the moment in fortpac
   *
   * @summary Returns an array of objects that contains the regionals basic information
   *
   * @return {Array} regionalsList
   */
  async getRegionals() {
    const regionalsQuery = Database.from('recruiter_has_industries').select('regional_director_id').distinct();

    const query = Database.table('v_users')
      .select('*')
      .whereIn('v_users.id', regionalsQuery)
      .orderBy('v_users.user_name', 'asc');

    return await query;
  }

  async getCoachesInfoByRegion(regionalId){
    const subqueryCoaches = Database.from('recruiter_has_industries')
      .select('coach_id')
      .where('regional_director_id', regionalId)
      .distinct();

    const result = (
        await User.query()
          .select(['users.id', 'users.personal_information_id'])
          .with('personalInformation')
          .innerJoin('personal_informations as pi', 'pi.id', 'users.personal_information_id')
          .orderBy('pi.full_name', 'asc')
          .whereIn('users.id', subqueryCoaches)
          .fetch()
    ).toJSON();

    return result;
  }

  /**
   * Returns all the recruiters ids in the DIG at the moment in fortpac
   *
   * @summary Returns an array of objects that contains the recruiters basic information
   *
   * @return {Object[]} coachesList
   */
  async getRecruitersIds() {
    const recruiters = await Database.from('recruiter_has_industries').select('recruiter_id').distinct();

    return recruiters.map((row) => row.recruiter_id);
  }

  async recruitersByUsers(user_ids, column){
    return await Database.from('recruiter_has_industries')
      .whereIn(column, user_ids)
      .distinct('recruiter_id');
  }

  async getRecruitersBySpecialty(coachId, specialtyId){
    const recruitersBySpecialty = await Database.from('recruiter_has_industries')
      .distinct('recruiter_id')
      .where('specialty_id', specialtyId)
      .where('coach_id', '!=', coachId);

      return recruitersBySpecialty.map(item => item.recruiter_id)
  }

  async getRecruitersByCoach(coachId, recruiterId){
    const recruitersByCoach = await Database.from('recruiter_has_industries')
      .distinct('recruiter_id')
      .where('recruiter_id', '!=', recruiterId)
      .where('coach_id', coachId);

      return recruitersByCoach.map(item => item.recruiter_id)
  }

  async getCoachByRecruiterId(recruiter_id) {
    const result = await Database.from('recruiter_has_industries')
      .where('recruiter_id', recruiter_id)
      .first('coach_id');
    return result ? result.coach_id : null;
  }

  async getRegionalByCoachId(coachId) {
    const result = await Database.from('recruiter_has_industries')
      .where('coach_id', coachId)
      .first('regional_director_id');
    return result ? result.regional_director_id : null;
  }

  async recruitersByCoach(coachId) {
    const recruiters = await Database.from('v_users')
      .select([
        'id',
        'user_name as full_name'
      ])
      .where('coach_id', coachId)
      .where('user_status_id',userStatus.Active)
      .orderBy('user_name');

    return recruiters;
  }

  async recruitersFromUserTeam(userId) {
    const isCoach = await UserRepository.hasRole(userId, userRoles.Coach);
    if (isCoach) {
      return await this.recruitersByCoach(userId);
    }
    const coachId = await this.getCoachByRecruiterId(userId);
    return await this.recruitersByCoach(coachId);
  }

  async getCoachInfoById(coachId) {
    const coach = await UserRepository.getDetails(coachId);
    const team = await Team.findBy('coach_id', coach.id);
    coach.email_team = team ? team.email : null;

    return coach;
  }

  async getCoachInfoByRecruiterId(recruiterId) {
    let coach = null;
    const coachId = await this.getCoachByRecruiterId(recruiterId);

    if(coachId) {
      coach = await this.getCoachInfoById(coachId)
    } else {
      const isRecruiterCoach = await UserRepository.hasRole(recruiterId, userRoles.Coach);

      if (isRecruiterCoach) {
        coach = await this.getCoachInfoById(recruiterId);
      }
    }

    return coach;
  }

  async canAssign(recruiter_id, user_id){
    if(recruiter_id && recruiter_id != user_id){
      const isCoach = await UserRepository.hasRole(user_id, userRoles.Coach);
      const hasOverridePermission = await UserRepository.hasPermission(user_id, userPermissions.inventory.overrideAssignment);
      if (hasOverridePermission) {
        return { 
          success:true, 
          data: recruiter_id
        }
      } else if(isCoach) {
        const coachId = await this.getCoachByRecruiterId(recruiter_id);
        if(coachId != user_id){
          return {
            success: false,
            code: 400,
            message: 'The provided recruiter is not part of your team!',
          };
        }
      }
    }else {
      return { 
        success: true,
        data : user_id 
      }
    }
    return {
      success: true,
      data : recruiter_id
    }
  }
  

  async recruitersByTeamAndSameIndustry(userId) {
    const isCoach = await UserRepository.hasRole(userId, userRoles.Coach);
    const industries = Database.from('recruiter_has_industries')
      .distinct('industry_id')
      .where(isCoach ? 'coach_id' : 'recruiter_id', userId);
    const subQuery = Database.from('recruiter_has_industries')
      .distinct('recruiter_id')
      .where(isCoach ? 'coach_id' : 'recruiter_id', userId)
      .orWhereIn('industry_id',industries);
    const recruitersQuery = User
      .query()
      .select([
        'users.id as id',
        'pi.full_name',
      ])
      .leftJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .whereIn('users.id', subQuery)
      .orderBy('pi.full_name');
    return await recruitersQuery.fetch();
  }
}

module.exports = RecruiterRepository;
