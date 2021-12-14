'use strict';

//Utils
const axios = require('axios');
const Env = use('Env');
const promiseRetry = require('promise-retry');
const MAX_RETRIES = 3;
class PCRService {
  constructor() {
    this.sessionId = null;
    this.PCRUrl = Env.get('PCR_URL');
  }
  
  async initialize() {
    const response = await promiseRetry(
      (retry) => {
        return axios.get(`${this.PCRUrl}/access-token`, {
          params: {
            DatabaseId: Env.get('PCR_DATABASEID'),
            Username: Env.get('PCR_USERNAME'),
            Password: Env.get('PCR_PASSWORD'),
            AppId:  Env.get('PCR_APP_ID'),
            ApiKey: Env.get('PCR_API_KEY'),
          },
        }).catch(retry)
      },
      { retries: MAX_RETRIES }
    ).then((pcrResponse) => pcrResponse);
    this.sessionId = response.data.SessionId;
  }

  async validateSession(){
    !this.sessionId && await this.initialize();
  }

  async executeRequest(requestType, url, body){
    await this.validateSession();
    return promiseRetry(
      (retry) => {
        return axios[requestType](url, { params: {
          SessionID: this.sessionId,
          ...body
        }}).catch(retry)
      },
      { retries: MAX_RETRIES }
    ).then((pcrResponse) => pcrResponse);
  }

  async getCompany(name, city, state) {
    //PCR does not support some special characters so should be encoded
    // - ( 
    // - )
    // - ,
    // - %
    //Also uses the logical operators AND,OR so them should  be escaped with a backslash.
    //check https://www.pcrecruiter.net/apidocs_v2/#!/candidates
    //Sections 'Searching References' and 'Reference Guide'
    const query = `CompanyName eq ${name ? this.encodeSpecialCharacters(name) : ''} ${city ? `and City eq ${this.encodeSpecialCharacters(city)}` : ''} ${state ? `and State eq ${this.encodeSpecialCharacters(state)}` : ''}`;
    try {
      const response = await this.executeRequest('get',`${this.PCRUrl}/companies/`, {
        Query: query,
        Fields: `CompanyId,EmailWWWAddress`
      })
      return {
        success:true,
        data:response.data.Results
      };
    } catch (error) {
      return {
        success:false,
        error
      }
    }
   
  }

  encodeSpecialCharacters(str){
    return new String(str).replace(/\%/g,'%25').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\,/g,'%2C').replace(/ and /ig,' \\and ').replace(/ or /ig,' \\or ');
  }

  async getContactsByCompanyId(id) {
    try {
      let page = 1;
      let response = null;
      const contacts = [];
      do {
        response = await this.executeRequest('get',`${this.PCRUrl}/candidates/`, {
          Query: `CompanyId eq ${id}`,
          ResultsPerPage: 100,
          Page: page,
          Custom: 'Email_Other'
        })
        page++;
        contacts.push(...response.data.Results);
      } while (response.data.Results.length > 0);
      return {
        success: true,
        data: contacts,
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }

  }

  async getTemplates(filters = {}){
    const { perPage = 10, page = 1, orderBy, direction = 'ASC', user, keyword } = filters
    const recordTypeId = 3;//is the type id that corresponds to the users templates
    try {
      const params = {
        ResultsPerPage: perPage,
        Page: page,
        FieldsPlus: 'FormText'
      }
      if(orderBy){
        params.Order = `${orderBy} ${direction}`
      }
      if(user || keyword){
        const userSearch =  `${user ? `UserName eq ${user}` : ''}`;
        const nameSearch =  `${keyword ? `FormName co ${this.encodeSpecialCharacters(keyword)}` : ''}`;
        params.Query = `${userSearch} ${userSearch && nameSearch ? 'and' : ''} ${nameSearch}`
      }
      const response = await this.executeRequest('get',`${this.PCRUrl}/formletter/${recordTypeId}`, params);
      return {
        success:true,
        data:response.data
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }

  async getAllUsers() {
    try {
      await this.validateSession();
      let page = 1;
      let response = {
        data : {
          Results : []
        }
      }
      const users = [];
      do {
        response = await this.executeRequest('get',`${this.PCRUrl}/users`, {
          FieldsPlus: 'DatabaseId',
          ResultsPerPage: 100,
          Page: page
        })
        page++;
        users.push(...response.data.Results);
      } while (response.data.Results.length > 0);
      return {
        success:true,
        data:users
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
}

module.exports = PCRService;
