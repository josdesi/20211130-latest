// Utils
const capitals = use('App/Helpers/Migration/Capitals');
const { uploadFile } = use('App/Helpers/FileHelper');
const { find } = use('lodash');
const Database = use('Database');
const Excel = require('xlsx');
const Readable = require('stream').Readable;
const path = use('path');
const Ws = use('Socket.IO');
const appInsights = use('applicationinsights');
const { JobNames } = use('App/Scheduler/Constants');
const { defaultWhereResolver } = use('App/Helpers/QueryFilteringUtil');
const { userFilters, WebSocketNamespaces } = use('App/Helpers/Globals');
const Env = use('Env');


// Models
const Contact = use('App/Models/Contact');
const ZipCode = use('App/Models/ZipCode');
const Address = use('App/Models/Address');
const PersonalInformation = use('App/Models/PersonalInformation');
const MigrationLog = use('App/Models/MigrationLog');
const Migration = use('App/Models/Migration');

async function loadCityAndState(migrationData, countryColumn, stateColumn, cityColumn){
  const uniqCountries = [...new Set(migrationData.map((item) => (item[countryColumn] ? new String(item[countryColumn]).trim() : '')))];
  const countriesResult = await Database.raw(
    `SELECT id, title, slug FROM countries WHERE slug IN (${uniqCountries.map((_) => '?').join(',')}) `,
    [...uniqCountries]
  );
  const uniqCities = [...new Set(migrationData.map((item) => (item[cityColumn] ? new String(item[cityColumn]).formatToCompare() : '')))];
  capitals.data.forEach((capital)=>{
    uniqCities.push(capital.city)
  })
  const uniqStates = [...new Set(migrationData.map((item) => (item[stateColumn] ? new String(item[stateColumn]).trim() : '')))];
  const statesResult = await Database.raw(
    `SELECT id, country_id, title, slug FROM states WHERE slug IN (${uniqStates.map((_) => '?').join(',')}) `,
    [...uniqStates]
  );
  const citiesResult = await Database.raw(
    `SELECT id, state_id, LOWER(title) as title FROM cities WHERE LOWER(title) IN (${uniqCities
      .map((_) => 'LOWER(?)')
      .join(',')}) `,
    [...uniqCities]
  );
  return [citiesResult, statesResult, countriesResult];
}

async function getUserByInitials(initials) {
  const result = await Database.raw('SELECT id FROM users WHERE initials = ? LIMIT(1)', [initials]);
  return result.rowCount > 0 ? result.rows[0].id : null;
}

async function createContact(workPhone, mobilePhone, personalEmail, trx) {
  try {
    const contact = await Contact.create(
      {
        phone: extractPhone(workPhone),
        ext: extractExt(workPhone),
        mobile: extractPhone(mobilePhone),
        personal_email: personalEmail,
      },
      trx
    );
    return {
      success: true,
      data: contact,
    };
  } catch (error) {
    return {
      error,
      success: false,
    };
  }
}

async function createAddress(zip, stateSlug, city, address, states, cities, countries, countrySlug, trx, type) {
  let zipCodeData;
  let stateData;
  let cityData;
  let countryData;
  try {
    const zipCode = extractZipCode(zip);
    countryData = find(countries, { slug: countrySlug  });
    stateData = find(states, { slug: stateSlug, country_id: countryData ? countryData.id : null });
    if (stateData) {
      const capital = find(capitals.data, { abbr: stateSlug, country: countryData.slug });
      cityData =
        find(cities, { state_id: stateData.id, title: city ? city.formatToCompare() : '' }) ||
        find(cities, { state_id: stateData.id, title: capital.city.formatToCompare() });
      zipCodeData = await ZipCode.query()
        .where('city_id', cityData.id)
        .where('state_id', stateData.id)
        .where('zip_ch', zipCode)
        .first();
      if (!zipCodeData) {
        zipCodeData = await ZipCode.query().where('city_id', cityData.id).where('state_id', stateData.id).first();
      }
    } else {
      zipCodeData = await ZipCode.findBy('zip_ch', zipCode);
    }


    const dataToInsert = {
      city_id: !cityData && !zipCodeData ? null : (cityData && cityData.id) || zipCodeData.city_id,
      zip: (zipCodeData && zipCodeData.zip_ch) || null,
      coordinates: (zipCodeData && `(${zipCodeData.longitude},${zipCodeData.latitude})`) || null,
      address,
    };

    if(type === 'companies'){
      return {
        data: dataToInsert,
        success: true,
      }
    }

    const result = await Address.create(dataToInsert,trx);

    return {
      data: result,
      success: true,
    };
  } catch (error) {
    return {
      error,
      success: false,
    };
  }
}

function extractZipCode(zipcode) {
  return typeof zipcode === 'string' && zipcode.includes('-')
    ? zipcode.split('-')[0]
    : typeof zipcode === 'number'
    ? zipcode
    : null;
}

async function createPersonalInfo(contact_id, address_id, first_name, last_name, user_id, trx) {
  try {
    const personalInformation = await PersonalInformation.create(
      {
        first_name,
        last_name,
        contact_id,
        address_id,
        created_by: user_id,
        updated_by: user_id,
      },
      trx
    );
    return {
      data: personalInformation,
      success: true,
    };
  } catch (error) {
    return {
      error,
      success: false,
    };
  }
}

function extractExt(input) {
  if (typeof input !== 'string') {
    return null;
  }
  if (input.toString().includes('Ex.')) {
    return extractPhone(input.toString().split('Ex.')[1]);
  }
  return null;
}

function extractPhone(input) {
  let result = '';
  let str = input;
  if (typeof input !== 'string') {
    return null;
  }
  if (input.toString().includes('Ex.')) {
    str = input.toString().split('Ex.')[0];
  }
  for (const char of str) {
    if (char >= '0' && char <= '9') {
      result += char;
    }
  }
  return result;
}

function arrayToJsonProperties(columns) {
  const obj = {};
  for (const column of columns) {
    obj[column] = null;
  }
  return obj;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function bufferToReadableStream(fileBuffer) {
  const readable = new Readable();
  readable.push(fileBuffer);
  readable.push(null);
  return readable;
}

async function getDataFile(fileBuffer) {
  const book = Excel.read(fileBuffer);
  const sheet = book.Sheets[book.SheetNames[0]];
  return Excel.utils.sheet_to_json(sheet);
}

async function getColumnsToMap(fileBuffer, columnsToFind){
  const fieldsMapped = {};
  const book = Excel.read(fileBuffer);
  const sheet = book.Sheets[book.SheetNames[0]];
  const columnsFile = getColumnsDataSheet(sheet);
  for(const property in columnsToFind){
    const { column, required } = columnsToFind[property];
    fieldsMapped[property] = find(columnsFile, { title: column})  ? { column, required } : { column: null, required };
  }
  return {
    columnsFile,
    fieldsMapped
  }
}

function getColumnsDataSheet(sheet){
  return Object.keys(sheet)
    .filter((key) => /^[A-Z]+[1]{1}$/.test(key))
    .map((key) => {
      return {
        title: sheet[key].v,
        id: key
      }
    });
}

async function isValidFile(fileBuffer) {
  const book = Excel.read(fileBuffer);
  const sheet = book.Sheets[book.SheetNames[0]];
  const data = Excel.utils.sheet_to_json(sheet);
  if (data.length === 0) {
    return {
      success: false,
      error: 'The file is empty, make sure to upload a file with more than one row',
    };
  }
  return {
    success: true,
    data
  };
}

function getUniqueIndustries(migrationData, industryColumn, specialtyColumn, subspecialtyColumn) {
  const industries = [
    ...new Set(
      migrationData.map((item) => {
        return JSON.stringify({
          industry: String(item[industryColumn]).formatToCompare(),
          specialty: String(item[specialtyColumn]).formatToCompare(),
          subspecialty: item[subspecialtyColumn] ? String(item[subspecialtyColumn]).formatToCompare() : null,
          specialty_id: null,
          subspecialty_id: null,
        });
      })
    ),
  ];
  return industries.map((item) => JSON.parse(item));
}

function getUniquePositions(migrationData, industries_mapping, industryColumn, specialtyColumn, subspecialtyColumn, functionalTitleColumn) {
  const positions = [
    ...new Set(
      migrationData.map((item) => {
        const data = find(industries_mapping, {
          industry: item[industryColumn] ? item[industryColumn].formatToCompare() : null,
          specialty: item[specialtyColumn] ? item[specialtyColumn].formatToCompare() : null,
          subspecialty: item[subspecialtyColumn] ? item[subspecialtyColumn].formatToCompare() : null,
        });
        if (!data) {
          throw `${item[industryColumn]}, ${item[specialtyColumn]}, ${item[subspecialtyColumn]} not have an specialty provided`;
        }
        return JSON.stringify({
          title: item[functionalTitleColumn] ? item[functionalTitleColumn].formatToCompare() : null,
          specialty: {
            id: data.specialty_id,
            title: data.specialty,
            industry: data.industry,
          },
          id: null,
        });
      })
    ),
  ];
  return positions.map((item) => JSON.parse(item));
}

async function scheduleTask(migrationId, jobType) {
  const Agenda = use('Services/Agenda');
  await Agenda.now(jobType, {
    id: migrationId,
  });
}

async function migrationFile(file, columnsToFind) {
  await file.runValidations();

  const error = file.error();

  if (error.message) {
    return {
      success: false,
      status: 400,
      message: error.message,
    };
  }

  const fileBuffer = await streamToBuffer(file.stream);
  const evaluateResult = await isValidFile(fileBuffer);

  if (!evaluateResult.success) {
    return {
      success: false,
      status: 400,
      message: evaluateResult.error,
    };
  }

  const originalName = path.parse(file.clientName).name;
  const fileName = `${originalName}-${new Date().getTime()}.${file.extname}`;
  const readable = bufferToReadableStream(fileBuffer);
  const absolutePath = await uploadFile('migrations/' + fileName, readable);

  if (!absolutePath) {
    return {
      success: false,
      status: 500,
      message: 'There was a problem uploading the file, please try again later!',
    };
  }

  const { columnsFile = [], fieldsMapped } = await getColumnsToMap(fileBuffer, columnsToFind);

  return { success: true, absolutePath, fileName, originalName, evaluateResult, columnsFile, fieldsMapped };
}

async function createMigrationLog(migration) {
  try {
    const log = await MigrationLog.create({
      migration_id: migration.id,
      description: migration.description,
      progress: migration.progress,
      migration_type_id: migration.type,
    });

    return {
      success: true,
      data: log,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

async function thereIsAnExistingRun(migrationId) {
  const resultLog = await MigrationLog.query().where('migration_id', migrationId).fetch();
  const migration = await Migration.find(migrationId);
  return resultLog.rows.length > 1 || migration.status === 'in-progress';
}

async function broadcastLog(type, data) {
  if(!Ws.io) return;

  try {
    const migrationWs = Ws.io.of(WebSocketNamespaces.Migration);

    migrationWs && migrationWs.emit('message', {
      type,
      ...data
    });
  } catch (error) {
    appInsights.defaultClient.trackEvent({ name: 'Socket Error', properties: { type, data, error } });
  }
}

function setupListing() {
  const orderColumnsMap = {
    created_at: 'mg.created_at',
    progress: 'mg.last_progress',
    name: 'mg.name',
    status: 'mg.status'
  };
  const bindedDefaultWhereResolver = defaultWhereResolver.bind(this);
  const filterOptionsColumnMap = {
    type: {
      resolver: bindedDefaultWhereResolver,
      column: 'mg.type',
    },
    status: {
      resolver: bindedDefaultWhereResolver,
      column: 'mg.status',
    },
    is_high_priority: {
      resolver: bindedDefaultWhereResolver,
      column: 'mg.is_high_priority',
    },
    userFilter: {
      resolver: applyUserFilterResolver.bind(this),
    },
    userId: {
      resolver: bindedDefaultWhereResolver,
      column: 'mg.created_by',
    }
  };
  return {
    orderColumnsMap,
    filterOptionsColumnMap
  }
}

async function listing(userId, params){
  try {
    const { page = 1, perPage = 10, direction, orderBy, ...rest } = params;
    const {  
      orderColumnsMap,
      filterOptionsColumnMap
    } = setupListing();
      const query =  Database.table('migrations as mg')
        .select([
          'mg.last_progress as progress',
          'mg.id as id',
          'mg.created_by',
          'mg.original_name as name',
          'mg.created_at',
          'mg.status',
          'mg.type',
          'mg.is_high_priority',
          'usr.initials'
        ])
        .innerJoin('users as usr','mg.created_by','usr.id');

      await applyWhereClause(rest, query, userId, filterOptionsColumnMap);
      applyOrderClause(direction, orderBy, query, orderColumnsMap);
      const result = await query.paginate(page, perPage);
    return {
      code: 200,
      success: true,
      data: result
    };
  } catch (error) {
    appInsights.defaultClient.trackException({ exception: error });

    return {
      code: 500,
      success: false,
      message: 'There was a problem getting the progresses, please try again later!',
    };
  }
}

async function applyWhereClause(filters, query, user_id, filterOptionsColumnMap) {
  for (const keyFilter of Object.keys(filterOptionsColumnMap)) {
    const filterMapEntry = filterOptionsColumnMap[keyFilter];
    if (!filterMapEntry) continue;
    const { resolver, column, parser, operator } = filterMapEntry;
    const value = parser instanceof Function ? parser(filters[keyFilter]) : filters[keyFilter];
    if (!value || !(resolver instanceof Function)) continue;
    await resolver({ query, column, value, user_id, operator });
  }
}

async function applyUserFilterResolver({ query, user_id, value }) {
  switch (Number(value)) {
    case userFilters.Mine:
      query.where('mg.created_by',user_id);
      break;
    default:
      break;
  }
}

function applyOrderClause(direction = 'asc', orderBy = 'created_at', query, orderColumnsMap) {
  const validDirections = ['asc', 'desc'];
  const orderColumn = orderColumnsMap[orderBy] || orderColumnsMap['created_at'];
  const orderDirection =
  validDirections.find((dir) => dir.toLowerCase() === direction.toLowerCase()) || validDirections[0];
  query.orderByRaw(`${orderColumn} ${orderDirection} NULLS LAST`);
}

async function migrationProgress(migrationId) {
  try {
    const result = await MigrationLog.query()
      .where('migration_id', migrationId)
      .orderBy('created_at', 'asc')
      .fetch();

    return {
      code: 200,
      success: true,
      data: {
        logs:result
      },
    };
  } catch (error) {
    appInsights.defaultClient.trackException({ exception: error });

    return {
      code: 500,
      success: false,
      message: 'There was a problem progress the migration, please try again later',
    };
  }
}

async function canProcessPending(){
  const timeInMs = new Date().valueOf();
  const hourInTwentyFourFormat = Env.get('HOUR_TO_PROCESS_MIGRATION_PENDING',15);
  if( (timeInMs < new Date().setHours(hourInTwentyFourFormat)) ){
    return false;
  }
  const migrationsRunningQuery = await Database.raw( ` 
    SELECT mg.id
      FROM migrations AS mg
        WHERE  status = 'in-progress'
        AND mg.is_high_priority = true
        AND mg.created_at :: DATE = Now() :: DATE
        AND EXISTS (SELECT ml.id
            FROM   migration_logs AS ml
            WHERE  ml.migration_id = mg.id
              AND Date_part('minute', Now() - ml.created_at) < 10); 
  `);
  if(migrationsRunningQuery.rowCount === 0){
    return true;
  }
  return false;
}

async function processPending(){
  const processToRun = 2;
  const pendingRunning = await Database.raw(`
    SELECT mg.id
    FROM migrations as mg
      WHERE mg.status = 'in-progress'
      AND mg.is_high_priority = false
      AND mg.created_at :: DATE = Now() :: DATE
        AND EXISTS (SELECT ml.id
            FROM   migration_logs AS ml
            WHERE  ml.migration_id = mg.id
              AND Date_part('minute', Now() - ml.created_at) < 10); 
  `)
  const jobsAvailable = processToRun - pendingRunning.rowCount;
  if(jobsAvailable <= 0){
    return;
  }
  const jobNameType = {
    'company': JobNames.Migrations.Company,
    'contacts': JobNames.Migrations.Contacts
  } 
  const result = await Database.table('migrations')
    .select(['id','type'])
    .where('is_high_priority', false)
    .where('status','config-completed')
    .limit(jobsAvailable);
  for(const migration of result){
    await scheduleTask(migration.id, jobNameType[migration.type]);
  }
}

async function purgeIdleProcess(){
  const Agenda = use('Services/Agenda');
  const jobNameType = {
    'company': JobNames.Migrations.Company,
    'contacts': JobNames.Migrations.Contacts
  } 
  let previousDate = new Date();
  previousDate.setDate( previousDate.getDate() - 1 );
  const idleMigrations = await Database.raw(`
    SELECT mg.id, mg.type
    FROM migrations as mg
      WHERE mg.status = 'in-progress'
      AND EXISTS (SELECT ml.id
          FROM   migration_logs AS ml
          WHERE  ml.migration_id = mg.id
            AND Date_part('hour', Now() - ml.created_at) > 1); 
  `)
  for(const migration of idleMigrations.rows){
    await Database
      .table('migrations')
      .where('id', migration.id)
      .update('status', 'error');
    await Agenda.cancel({
      name: jobNameType[migration.type],
      'data.id': migration.id,
    });  
  }
  const jobs = await Agenda.jobs(
    { 
      $or: [ { name:  JobNames.Migrations.Company}, { name:  JobNames.Migrations.Contacts} ],
      lastRunAt:  { $lt : previousDate.toISOString() } 
    }
  );
  for(const job of jobs){
    await Agenda.cancel({
      _id: job.attrs._id
    });  
  }
}

function unwrapEntryData(entry, fieldsMapped){
  const formatValue = (val) => {
    if(val){
      switch (typeof val) {
        case 'string':
          return val.trim();
        default:
          return val;
      }
    }
    return null;
  };
  let data = {};
  for(const field in fieldsMapped){
    const column = fieldsMapped[field];
    const val = entry[column];
    data[field] = formatValue(val);
  }
  return data;
}

module.exports = {
  createContact,
  createAddress,
  createPersonalInfo,
  getUserByInitials,
  arrayToJsonProperties,
  getDataFile,
  streamToBuffer,
  bufferToReadableStream,
  extractPhone,
  extractExt,
  isValidFile,
  getUniqueIndustries,
  scheduleTask,
  getUniquePositions,
  migrationFile,
  createMigrationLog,
  extractZipCode,
  loadCityAndState,
  thereIsAnExistingRun,
  broadcastLog,
  listing,
  migrationProgress,
  canProcessPending,
  processPending,
  purgeIdleProcess,
  getColumnsToMap,
  unwrapEntryData,
  getColumnsDataSheet
};
