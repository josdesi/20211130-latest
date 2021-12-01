'use strict';
//Utils
const Antl = use('Antl');
const Database = use('Database');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const appInsights = require('applicationinsights');
const moment = use('moment');
const colors = use('nice-color-palettes');
const { uniqWith, isEqual, find, groupBy, uniqBy , filter, values, flatten, pick } = use('lodash');
const { userRoles, OperationType, EntityTypes, userStatus } = use('App/Helpers/Globals');
const { defaultWhereResolver } = use('App/Helpers/QueryFilteringUtil');

//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Models
const User = use('App/Models/User');

class DigRepository {
  constructor() {
    const bindedDefaultWhereResolver = defaultWhereResolver.bind(this);

    this._filterOptionsColumnMap = {
      industryId: {
        resolver: bindedDefaultWhereResolver,
        column: 'spec.industry_id',
      },
      stateId: {
        resolver: bindedDefaultWhereResolver,
        column: 'st.id',
      },
      specialtyId: {
        resolver: bindedDefaultWhereResolver,
        column: 'spec.id',
      },
      subspecialtyId: {
        resolver: bindedDefaultWhereResolver,
        column: 'subspec.id',
      },
      coachId: {
        resolver: bindedDefaultWhereResolver,
        column: 'recruiter.coach_id',
      },
      recruiterId: {
        resolver: bindedDefaultWhereResolver,
        column: 'rhi.recruiter_id',
      },
      userStatusId: {
        resolver: bindedDefaultWhereResolver,
        column: 'recruiter.user_status_id',
      },
    };
  }

  /**
   * Returns a custom response of the recruiter industries info
   *
   * @param {Object} queryParams
   *
   * @return {Object} Dig Info Displayed on the Map
   */
  async getDigMap(queryParams = {}) {
    try {
      queryParams.userStatusId = userStatus.Active; //To always show active users.
      const { specialtyId, subspecialtyId, keyword, searchModel } = queryParams;
      const query = Database.from('recruiter_has_industries as rhi');
      query
        .select([
          'rhi.id',
          'pi.first_name',
          'pi.last_name',
          'pi.full_name',
          'spec.industry as industry_title',
          'st.id as state_id',
          'st.slug as state_slug',
          'st.title as state_title',
          'st.coordinates[1] as latitude',
          'st.coordinates[0] as longitude',
          'recruiter.user_email as email',
          'ct.phone',
          'recruiter.initials',
          'ct.ext',
          'recruiter.coach_name as coach',
          'spec.title as specialty_title',
          'subspec.title as subspecialty_title',
          'spec.industry_id',
          'spec.id as specialty_id',
          'subspec.id as subspecialty_id',
        ])
        .innerJoin('v_users as recruiter', 'rhi.recruiter_id', 'recruiter.id')
        .innerJoin('personal_informations as pi', 'recruiter.personal_information_id', 'pi.id')
        .leftJoin('addresses as addr', 'pi.address_id', 'addr.id')
        .leftJoin('contacts as ct', 'pi.contact_id', 'ct.id')
        .leftJoin('v_specialties as spec', 'rhi.specialty_id', 'spec.id')
        .leftJoin('subspecialties as subspec', 'rhi.subspecialty_id', 'subspec.id')
        .innerJoin('states as st', 'rhi.state_id', 'st.id');

      await this.applyWhereClause(queryParams, query);
      keyword && this.applySearchClause(keyword, searchModel, query);
      !keyword && query.orderBy('pi.full_name', 'asc');

      const recruiterIndustries = await query;
      return {
        code: 200,
        data: this.withCustomFormatting(recruiterIndustries, specialtyId, subspecialtyId),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'pil info',
        }),
      };
    }
  }

  /**
   * Applies the custom where clauses to a query
   *
   * @param {Object} filters
   * @param {Query} query
   */
  async applyWhereClause(filters, query) {
    for (const keyFilter of Object.keys(this._filterOptionsColumnMap)) {
      const filterMapEntry = this._filterOptionsColumnMap[keyFilter];
      if (!filterMapEntry) continue;
      const { resolver, column, parser, operator } = filterMapEntry;
      const value = parser instanceof Function ? parser(filters[keyFilter]) : filters[keyFilter];
      if (!value || !(resolver instanceof Function)) continue;
      await resolver({ query, column, value, operator });
    }
  }

  /**
   * Applies the search model required to search on the query
   *                    ******Note*********
   * Seems like always uses the B model , not sure if this could change
   * but Maybe we could only leave the used model
   *
   * @param {String} keyword
   * @param {String} searchModel
   * @param {Query} query
   */
  applySearchClause(keyword, searchModel, query) {
    switch (searchModel) {
      case 'A':
        this.applySearchModelA(query, keyword);
        break;
      default:
        this.applySearchModelB(query, keyword);
        break;
    }
  }

  applySearchModelA(query, keyword) {
    const terms = keyword.trim().replace(/\s\s+/g, ' ').split(' ');
    const threshold = 0.5;
    let orderExpression = '';
    let orderTerms = [];
    query.where(function () {
      for (const term of terms) {
        this.orWhere('pi.full_name', 'ilike', `%${term}%`)
          .orWhereRaw(`word_similarity(?, pi.first_name) >= ${threshold}`, [term])
          .orWhereRaw(`word_similarity(?, pi.last_name) >=  ${threshold}`, [term]);
      }
    });
    for (const [index, term] of terms.entries()) {
      orderExpression += 'word_similarity(?, pi.first_name) + word_similarity(?, pi.last_name)';
      if (index < terms.length - 1) orderExpression += ' + ';
      orderTerms = orderTerms.concat([term, term]);
    }
    query.orderByRaw(`(? <<-> pi.full_name)`, [keyword]);
    query.orderByRaw(`(${orderExpression}) desc`, orderTerms);
  }

  applySearchModelB(query, keyword) {
    query.where(function () {
      this.orWhere('pi.full_name', 'ilike', `%${keyword}%`).orWhereRaw('pi.full_name %> ?', [keyword]);
    });
    query.orderByRaw('? <<-> pi.full_name', [keyword]);
  }

  /**
   * Formats the industry data to be able to display on the map

   * @param {Array} recruiterIndustries
   * @param {Integer} specialtyId
   * @param {Integer} subspecialtyId
   * 
   * @return A custom object 
   *    @list {Array} Recruiters with the states that are working
   *    @map {Array}  Custom Points that contains the recruiters working on each state
   * I'm sure the response could be optimized to not repeat the same fields on each object 
   * but that will require changes on the displayed map and for now is not the priority
   */
  withCustomFormatting(recruiterIndustries, specialtyId, subspecialtyId) {
    const recruiterColors = this.getRecruitersColorIcon(recruiterIndustries);
    const recruitersStates = this.getRecruitersWithStates(recruiterIndustries, recruiterColors);
    const pointsCoordinates = this.getRecruiterStateCoordinates(
      recruiterIndustries,
      recruiterColors,
      specialtyId,
      subspecialtyId
    );

    return {
      list: recruitersStates,
      map: pointsCoordinates,
    };
  }

  /**
   * Returns an array of uniq recruiters with a color
   *
   * @param {Array} recruiterIndustries
   */
  getRecruitersColorIcon(recruiterIndustries) {
    const recruitersCopy = JSON.parse(JSON.stringify(recruiterIndustries));
    const flatColors = flatten(colors);
    return uniqBy(recruitersCopy, 'email').map((recruiter, index) => {
      recruiter.color = flatColors[index];
      return recruiter;
    });
  }

  /**
   * Returns an array of uniq recruiters with his working states
   *
   * @param {Array} recruiterIndustries
   * @param {Array} recruiterColors
   *
   */
  getRecruitersWithStates(recruiterIndustries, recruiterColors) {
    const dataByRecruiterEmail = groupBy(recruiterIndustries, 'email');
    const recruitersWithStates = values(dataByRecruiterEmail).map((digData) => {
      const states = uniqBy(digData, 'state_slug').map((value) => {
        return pick(value, ['state_id', 'state_slug', 'state_title', 'latitude', 'longitude']);
      });
      const recruiterInfo = find(recruiterColors, { email: digData[0].email });
      recruiterInfo.states = states;
      return recruiterInfo;
    });
    return recruitersWithStates;
  }

  /**
   * Returns an array of uniq state points that contains
   * the recruiters working on them
   *
   * @param {Array} recruiterIndustries
   * @param {Array} recruiterColors
   * @param {Integer} specialtyId
   * @param {Integer} subspecialtyId
   *
   */
  getRecruiterStateCoordinates(recruiterIndustries, recruiterColors, specialtyId, subspecialtyId) {
    const recruitersUniqDig = this.getUniqDigRecruiter(recruiterIndustries, specialtyId, subspecialtyId);
    const recruitersUniqDigByState = uniqBy(recruitersUniqDig, 'state_slug');
    const points = values(recruitersUniqDigByState).map((stateInfo) => {
      const { latitude, longitude, state_slug } = stateInfo;
      const recruitersOnThisState = recruitersUniqDig.filter((digData) => digData.state_slug === state_slug);
      return {
        latitude,
        longitude,
        state: state_slug,
        values: recruitersOnThisState.map((value) => {
          const recruiter = find(recruiterColors, { email: value.email });
          value.color = recruiter ? recruiter.color : '';
          return value;
        }),
      };
    });
    return points;
  }

  /**
   * Returns an array of uniq dig recruiter relations
   *
   * @param {Array} recruiterIndustries
   * @param {Integer} specialtyId
   * @param {Integer} subspecialtyId
   *
   */
  getUniqDigRecruiter(recruiterIndustries, specialtyId, subspecialtyId) {
    return uniqBy(recruiterIndustries, (digRow) => {
      const { email, state_slug, industry_id, specialty_id, subspecialty_id } = digRow;
      const uniqValues = [email, state_slug, industry_id];
      specialtyId && uniqValues.push(specialty_id);
      subspecialtyId && uniqValues.push(subspecialty_id);
      return uniqValues.join();
    });
  }

  /**
   * Returns a custom response that determines
   * the saved changes of a DIG
   *
   * @method create
   *
   * @param {Object} userData {initials, first_name, last_name, phone, extension, status, address, zip, job_title, roles}
   * @param {Object} dig {data, mode, coach_id, regional_director_id}
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async save(userData, dig, userAuthId) {
    let trx;
    try {
      trx = await Database.beginTransaction();
      const thereAreChanges = userData.hasOwnProperty('thereAreChanges') ? userData.thereAreChanges : true;
      const { resultUser, operation, wereItemsMoved, candidateIds = []  } = await this.saveUserInfo(userData, userAuthId, thereAreChanges, dig.regional_director_id, trx);
      if (!resultUser.success) {
        appInsights.defaultClient.trackException({ exception: resultUser.error });
        trx && (await trx.rollback());
        return {
          success: false,
          code:  resultUser.code,
          message:  resultUser.error,
        };
      }
      const { userId } = resultUser;
      const { coach_id, regional_director_id } = this.unwrapTeamInfo(userData, dig, userId); 
      const { data = [], mode } = dig;
      const dateNow = moment();
      switch (mode) {
        case 'only-team':
          await trx
            .table('recruiter_has_industries')
            .where('recruiter_id', userId)
            .update({ coach_id, regional_director_id, updated_at: dateNow, updated_by: userAuthId  });
          break;
        case 'dig':
          await this.insertDigData(data, userId, coach_id, regional_director_id, userAuthId, dateNow,  trx);
          break;
        default:
          break;
      }
      await trx.commit();
      thereAreChanges && await UserRepository.refreshUsersView();

      const userBasicInfo = await UserRepository.getBasicInfo(userId);
      Event.fire(EventTypes.Dig.Updated, {
        userId,
        authUserId: userAuthId,
        payload: userBasicInfo.data,
        entity: EntityTypes.User,
        operation,
        wereItemsMoved,
        candidateIds,
        coachTeamId: userData.backupCoachId ? userData.backupCoachId : null
      });

      const  userDig  = await this.getUserDig(userId);
      return {
        success: true,
        code: 201,
        data : {
          ...userDig.data,
          userId
        }
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        message: 'There was a problem saving the DIG data, please try again later',
      };
    }
  }

  
  async saveUserInfo(userData = {}, userAuthId, thereAreChanges, regionalDirectorId, trx){
    const { status, backupCoachId, roles, teamEmail, id } = userData;
    let resultUser ,operation, userHasCoachRole = false;
    let wereItemsMoved = false;
    let candidateIds = [];

    const userInfo = await User.find(id);

    if (!userInfo) {
      resultUser = await UserRepository.create(userData, trx, userAuthId);
      userHasCoachRole = !!find(roles, { id: userRoles.Coach });
      if(userHasCoachRole){
        const updateResult = await this.updateCoachTeam({ userStatusId : status, backupCoachId, userId : resultUser.userId, teamEmail, userData, regionalDirectorId, trx });
        if(!updateResult.success){
          return {
            resultUser : updateResult
          };
        }
      }
      operation = OperationType.Create;
    } else {
      const { hasAtLeastOne } = await UserRepository.hasRoles(userInfo.id, [userRoles.Coach]);
      userHasCoachRole = hasAtLeastOne;
      const userHadCoachRole = !(!!find(roles, { id: userRoles.Coach })) && userHasCoachRole;
      const userWillHaveCoachRole = !!find(roles, { id: userRoles.Coach });
      const validateUserResult = await this.canUpdateUser(userInfo, userHadCoachRole, userHasCoachRole, status);
      if(!validateUserResult.success){
        return {
          resultUser : validateUserResult
        };
      }
      if(status === userStatus.Inactive || userHadCoachRole){
        const { data: { office_user_id } = {} } = await UserRepository.findOrCreateTeamCoach({ userId : userInfo.id, teamEmail, extTransaction : trx });
        const coachIdForTeam = backupCoachId;
        if(coachIdForTeam && status === userStatus.Inactive){
          const resultUserMove = await UserRepository.moveUserItemsToOffice(userInfo.id, coachIdForTeam, trx);
          wereItemsMoved = resultUserMove.wereItemsMoved ? true : wereItemsMoved;
          wereItemsMoved && candidateIds.push(...resultUserMove.candidateIds);
        }
        if(coachIdForTeam && userHadCoachRole && office_user_id){
          const resultOfficeMove = await UserRepository.moveUserItemsToOffice(office_user_id, coachIdForTeam, trx);
          wereItemsMoved = resultOfficeMove.wereItemsMoved ? true : wereItemsMoved;
          wereItemsMoved && candidateIds.push(...resultOfficeMove.candidateIds);
        }
      }
      if(userHadCoachRole || userHasCoachRole || userWillHaveCoachRole){
        const updateResult = await this.updateCoachTeam({ userStatusId : status, backupCoachId, userId : userInfo.id, userWasCoach : userHadCoachRole, teamEmail, userData, regionalDirectorId, trx });
        if(!updateResult.success){
          return {
            resultUser : updateResult
          };
        }
      }
      operation = OperationType.Update;
      resultUser = !thereAreChanges
          ? { success: true, userId: userInfo.id }
          : await UserRepository.update(userInfo, userData, trx, userAuthId);
    
    }
    return {
       resultUser,
       operation,
       wereItemsMoved,
       candidateIds
    };
  }


  async updateCoachTeam({ userStatusId, backupCoachId, userId, userWasCoach = false, teamEmail, userData = {}, regionalDirectorId, trx }){
    const result = await UserRepository.findOrCreateTeamCoach({ userId, teamEmail, userData, extTransaction : trx });
    if(!result.success){
      return result;
    }
    const regional_director_id  = regionalDirectorId ||  (await UserRepository.getCoachAndRegionalDirector(userId)).regional_director_id;
    const { id, office_user_id } = result.data;
    const activeTeam = userStatusId === userStatus.Active && !userWasCoach;
    const dataToUpdate = {
      active: activeTeam,
      backup_coach_id: backupCoachId,
      email: teamEmail,
      regional_director_id
    };
    await trx
      .table('teams')
      .where('id', id)
      .update(dataToUpdate);
    await trx.table('users').where('id',office_user_id).update({ user_status_id: activeTeam ? userStatus.Active : userStatus.Inactive });
    
    return {
      success: true
    }
  }


  async canUpdateUser(user, userWasCoach, userIsCoach, statusToSave){ 
    if(userWasCoach || (userIsCoach && user.user_status_id != statusToSave && statusToSave === userStatus.Inactive) ){
        const digTeams = await Database.table('recruiter_has_industries as rhi')
          .select(['rhi.id','rhi.recruiter_id'])
          .where('rhi.coach_id',user.id)
          .where('rhi.recruiter_id', '!=', user.id)
          .whereRaw('rhi.recruiter_id != (SELECT office_user_id FROM teams WHERE coach_id = ?)',[user.id]);

        if(digTeams.length > 0){
          return {
            success : false,
            code: 400,
            error: "There are still recruiters assigned to this coach, reassign them before you remove the coach."
          }
        }
    }
    return {
      success : true
    }
  }

  unwrapTeamInfo(userData, dig, userId){
    let coach_id;
    let regional_director_id;
    if (find(userData.roles, { id: userRoles.RegionalDirector })) {
      coach_id = userId;
      regional_director_id = userId;
    } else if (find(userData.roles, { id: userRoles.Coach })) {
      coach_id = userId;
      regional_director_id = dig.regional_director_id;
    } else {
      coach_id = dig.coach_id;
      regional_director_id = dig.regional_director_id;
    }
    return {
      coach_id,
      regional_director_id
    }
  }

  async insertDigData(data, userId, coach_id, regional_director_id, userAuthId, dateNow, trx) {
    const dataToInsert = [];
    for (const item of data) {
      const { specialty_id, industry_id, states = [], subspecialties = [] } = item;
      if(subspecialties.length === 0 && states.length > 0){
        subspecialties.push([{}]);
      }
      subspecialties.forEach((_, iterator) => {
        for (const subspecialty of !subspecialties[iterator] ? subspecialties : subspecialties[iterator]) {
          states[iterator].forEach((state) => {
            dataToInsert.push({
              recruiter_id: userId,
              specialty_id,
              coach_id,
              regional_director_id,
              industry_id,
              subspecialty_id: subspecialty ? subspecialty.id : null,
              state_id: state.id,
              created_at: dateNow,
              updated_at: dateNow,
              created_by: userAuthId,
              updated_by: userAuthId
            });
          });
        }
      });
    }
    await trx.table('recruiter_has_industries').where('recruiter_id', userId).delete();
    if(dataToInsert.length > 0){
      await trx.insert(uniqWith(dataToInsert, isEqual)).into('recruiter_has_industries');
    }
  }

  /**
   * Returns a custom response with the
   * user dig
   *
   * @method getUserDig
   *
   * @param {Integer} userId 
   * @param {Boolean} userId 
   *
   * @return {Object} A success with a code 200 and data or a message error with an error code
   *
   */
  async getUserDig(userId, isFlatFormat = false) {
    try {
      const response = {
        success: true,
        code: 200,
        data: []
      };
      const result = await Database.table('recruiter_has_industries as rhi')
        .select([
          'rhi.id',
          'rhi.recruiter_id',
          'rhi.industry_id',
          'rhi.state_id',
          'rhi.coach_id',
          'rhi.specialty_id',
          'rhi.subspecialty_id',
          'rhi.regional_director_id',
          'st.slug as state_slug',
          'st.title as state_title',
          'ctry.slug as country_slug',
          'spec.title as specialty_title',
          'itry.title as industry_title',
          'subsp.title as subspecialty_title',
        ])
        .innerJoin('specialties as spec', 'rhi.specialty_id', 'spec.id')
        .innerJoin('industries as itry', 'spec.industry_id', 'itry.id')
        .innerJoin('states as st', 'rhi.state_id', 'st.id')
        .innerJoin('countries as ctry', 'st.country_id', 'ctry.id')
        .leftJoin('subspecialties as subsp', 'rhi.subspecialty_id', 'subsp.id')
        .where('recruiter_id', userId);
      if(isFlatFormat){
        response.data = result;
        return response;
      }
      if (result.length > 0) {
        const { coach_id, regional_director_id } = result[0];
        const coach = coach_id ? await UserRepository.getDetails(coach_id) : null;
        const director = regional_director_id ? await UserRepository.getDetails(regional_director_id) : null;
        const teamInfo = (coach || director) ? {coach, director} : null;
        const res = groupBy(result, 'specialty_id');
        for (const property in res) {
          res[property] = this.groupByStateAndSubspecialty(res[property] );
        }
        response.data = {
          teamInfo,
          dig: res,
        };
        return response;
      }
      response.data = {
        dig: {},
        teamInfo: null,
      };
      return response;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem saving the DIG data, please try again later',
      };
    }
  }

  groupByStateAndSubspecialty(digData){
    const groupByStates =  groupBy(digData, function (item) {
      const statesOfSubspecialty = uniqBy(filter(digData, { subspecialty_id : item.subspecialty_id }),'state_id');
      const states = statesOfSubspecialty.map(val => val.state_id).join(',') 
      return states;
    })
    const result = values(groupByStates).map((items) => ({
      subspecialties: uniqBy(items,'subspecialty_id'),
      states: uniqBy(items,'state_id')
    }));
    return result;
  }
}

module.exports = DigRepository;
