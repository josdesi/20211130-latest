'use strict'

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env')

/** @type {import('@adonisjs/ignitor/src/Helpers')} */
const Helpers = use('Helpers')

module.exports = {
  /*
  |--------------------------------------------------------------------------
  | Default Connection
  |--------------------------------------------------------------------------
  |
  | Connection defines the default connection settings to be used while
  | interacting with SQL databases.
  |
  */
  connection: Env.get('DB_CONNECTION', 'sqlite'),

  /*
  |--------------------------------------------------------------------------
  | Sqlite
  |--------------------------------------------------------------------------
  |
  | Sqlite is a flat file database and can be a good choice for a development
  | environment.
  |
  | npm i --save sqlite3
  |
  */
  sqlite: {
    client: 'sqlite3',
    connection: {
      filename: Helpers.databasePath(`${Env.get('DB_DATABASE', 'development')}.sqlite`)
    },
    useNullAsDefault: true,
    debug: Env.get('DB_DEBUG', false)
  },

  /*
  |--------------------------------------------------------------------------
  | MySQL
  |--------------------------------------------------------------------------
  |
  | Here we define connection settings for MySQL database.
  |
  | npm i --save mysql
  |
  */
  mysql: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', ''),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE', 'adonis')
    },
    debug: Env.get('DB_DEBUG', false)
  },

  /*
  |--------------------------------------------------------------------------
  | PostgreSQL
  |--------------------------------------------------------------------------
  |
  | Here we define connection settings for PostgreSQL database.
  |
  | npm i --save pg
  |
  */
  pg: {
    client: 'pg',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', ''),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE', 'adonis'),
      application_name: Env.get('APP_NAME', 'AdonisJs')
    },
    pool: { 
      min: parseInt(Env.get('DB_POOL_MIN', 1)),
      max: parseInt(Env.get('DB_POOL_MAX', 5))
    },
    debug: Env.get('DB_DEBUG', false)
  },

  pg_sockets: {
    host: Env.get('DB_HOST', 'localhost'),
    port: Env.get('DB_PORT', ''),
    user: Env.get('DB_USER', 'root'),
    password: Env.get('DB_PASSWORD', ''),
    database: Env.get('DB_DATABASE', 'adonis'),
    min: parseInt(Env.get('DB_SOCKET_POOL_MIN', 1)),
    max: parseInt(Env.get('DB_SOCKET_POOL_MAX', 5)),
    application_name: Env.get('APP_NAME', 'AdonisJs'),
  },
  
  // CONNECTION CONFIG FOR ANALYTICS DB
  pg_analytics: {
    client: 'pg',
    connection: {
      host: Env.get('DB_ANALYTICS_HOST', 'localhost'),
      port: Env.get('DB_ANALYTICS_PORT', ''),
      user: Env.get('DB_ANALYTICS_USER', 'root'),
      password: Env.get('DB_ANALYTICS_PASSWORD', ''),
      database: Env.get('DB_ANALYTICS_DATABASE', 'adonis'),
      application_name: Env.get('APP_NAME', 'AdonisJs'),
      ssl: {
        rejectUnauthorized: true,
      }
    },
    pool: { 
      min: parseInt(Env.get('DB_POOL_MIN', 1)),
      max: parseInt(Env.get('DB_POOL_MAX', 5))
    },
    debug: Env.get('DB_DEBUG', false)
  }
}
