const { hooks } = require('@adonisjs/ignitor');
const { ioc } = require('@adonisjs/fold');
const appInsights = require("applicationinsights");

hooks.after.providersBooted(() => {
  const Env = use('Env');

  registerHtmlSanitizor();
  registerExistFieldValidator();
  registerCustomUrlValidator();
  registerNotMultipleFieldsAtOnceValidator();
  registerArrayOfEmailsValidator();
  registerArrayOfIntegers();
  castPGTypesToGetNumbers();
  appInsights.setup(Env.get('APPINSIGHTS_INSTRUMENTATIONKEY')).start();
  //Will Be Removed on Upcoming PRs
  Object.defineProperty(String.prototype, 'formatToCompare', {
    value() {
      return this.toLowerCase().trim();
    }
  });
})


hooks.before.httpServer(() => {
  const Env = use('Env');
  const  moment = require('moment-timezone');
  if(Env.get('NODE_ENV') === 'development'){
    moment.tz.setDefault('UTC');
  }
})

function registerHtmlSanitizor() {
  const sanitizeHtml = require('sanitize-html');
  const { sanitizor } = use('Validator')
  var blacklist = {
    'iframe': true,
  };

  sanitizor.stripHtmlTags = (val) => {
    return sanitizeHtml(val,{
      allowedTags: sanitizeHtml.defaults.allowedTags,
      exclusiveFilter: function(frame) {
        return blacklist[frame.tag];
      }
    });
  }
}

function registerExistFieldValidator(){
  const Validator = use('Validator')
  const Database = use('Database')
  
  const existsFd  = async (data, field, message, args, get) => {
    const value = get(data, field)
    if (!value) {
      return
    }
  
    const [table, column] = args
    const row = await Database.table(table).where(column, value).first()
  
    if (!row) {
      throw message
    }
  }
  
  Validator.extend('existsFd', existsFd )
}

/*
 *
 * This validation checks if any other field is passed, if they exists simultaneously, throw a error
 * Example: uniqueFieldName: 'notMultipleFields:a, b, c '
 * if uniqueFieldName exists, and so does either a, b or c, it throws a error, only uniqueFieldName can be passed
 *
 */
function registerNotMultipleFieldsAtOnceValidator() {
  const Validator = use('Validator');

  const notMultipleFields = async (data, field, message, args, get) => {
    const value = get(data, field);

    //You see, if a field has the value false, it catches the field as empty since !value is true, but that's the problem, a field with value false is not always empty
    if (value === null) {
      return;
    }

    const fields = args;

    const existsSimultaneously = fields.flatMap((field) => {
      const exists = get(data, field);
      return exists !== null ? field : [];
    });

    if (existsSimultaneously.length > 0) {
      throw `${message} | Fields found: ${existsSimultaneously}`;
    }
  };

  Validator.extend('notMultipleFields', notMultipleFields);
}

function registerCustomUrlValidator(){
  const Validator = use('Validator')
  
  const customUrl  = async (data, field, message, args, get) => {
    const value = get(data, field)
    if (!value) {
      return;
    }

    const urlRegex = /^(?:[A-Za-z0-9]+:\/\/)?(?:(?:(?:[A-Za-z0-9])|(?:[A-Za-z0-9](?:[A-Za-z0-9\-]+)?[A-Za-z0-9]))+(\.))+([A-Za-z]{2,})([\/?])?([\/?][A-Za-z0-9\-%._~:\/?#\[\]@!\$&\'\(\)\*\+,;=]+)?$/
    if (!urlRegex.test(value)) {
      throw message
    }
  }
  
  Validator.extend('customUrl', customUrl )
}

function registerArrayOfEmailsValidator() {
  const Validator = use('Validator');
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const arrayOfEmails = async (data, field, message, args, get) => {
    const emails = get(data, field);
    if (!emails || (Array.isArray(emails) && emails.length === 0)) {
      return;
    }
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        throw message;
      }
    }
  };
  Validator.extend('arrayOfEmails', arrayOfEmails);
}

function registerArrayOfIntegers() {
  const Validator = use('Validator');
  const arrayOfIntegers = async (data, field, message, args, get) => {
    const inputIntegers = JSON.parse(get(data, field));
    if (!Array.isArray(inputIntegers)) {
      return message;
    }
    const integers = inputIntegers.map(inputInteger => Number(inputInteger));
    if ((integers.length === 0)) {
      return;
    }
    for (const integer of integers) {
      if (Number.isNaN(integer) || !Number.isInteger(integer)) {
        throw message;
      }
    }
  };
  Validator.extend('arrayOfIntegers', arrayOfIntegers);
}

/*This functions overrides the default pg types to be able to return numbers
  when a integer field is retrieved
*/
function castPGTypesToGetNumbers() {
  const pg = require('pg')
  pg.types.setTypeParser(20, 'text', parseInt)
}