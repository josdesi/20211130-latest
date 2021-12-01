'use strict';

//Utils
const axios = require('axios');
const Env = use('Env');
const promiseRetry = require('promise-retry');
class PCRService {
  constructor() {
    this.sessionId = null;
  }
  async initialize() {
    const response = await promiseRetry(
      (retry, attempt) => {
        return axios.get(`${Env.get('PCR_URL')}/access-token`, {
          params: {
            DatabaseId: Env.get('PCR_DATABASEID'),
            Username: Env.get('PCR_USERNAME'),
            Password: Env.get('PCR_PASSWORD'),
            AppId:  Env.get('PCR_APP_ID'),
            ApiKey: Env.get('PCR_API_KEY'),
          },
        }).catch(retry)
      },
      { retries: 3 }
    ).then((pcrResponse) => pcrResponse);
    this.sessionId = response.data.SessionId;
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
      if (!this.sessionId) {
        await this.initialize();
      }
      const response = await promiseRetry(
        (retry, attempt) => {
          return axios.get(`${Env.get('PCR_URL')}/companies/`, {
            params: {
              SessionID: this.sessionId,
              Query: query,
              Fields: `CompanyId,EmailWWWAddress`
            },
          }).catch(retry)
        },
        { retries: 3 }
      ).then((pcrResponse) => pcrResponse);
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
      if (!this.sessionId) {
        await this.initialize();
      }
      let page = 1;
      let response = {
        data : {
          Results : []
        }
      }
      const contacts = [];
      do {
        response = await promiseRetry(
          (retry, attempt) => {
            return axios
              .get(`${Env.get('PCR_URL')}/candidates/`, {
                params: {
                  SessionID: this.sessionId,
                  Query: `CompanyId eq ${id}`,
                  ResultsPerPage: 100,
                  Page: page,
                  Custom: 'Email_Other'
                },
              })
              .catch(retry);
          },
          { retries: 3 }
        ).then((pcrResponse) => pcrResponse);
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
}

module.exports = PCRService;
