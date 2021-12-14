'use strict'

const Helpers = use('Helpers')
const Env = use('Env')

module.exports = {
  /*
  |--------------------------------------------------------------------------
  | Default disk
  |--------------------------------------------------------------------------
  |
  | The default disk is used when you interact with the file system without
  | defining a disk name
  |
  */
  default: 'local',

  disks: {
    /*
    |--------------------------------------------------------------------------
    | Local
    |--------------------------------------------------------------------------
    |
    | Local disk interacts with the a local folder inside your application
    |
    */
    local: {
      root: Helpers.tmpPath(),
      driver: 'local'
    },

    /*
    |--------------------------------------------------------------------------
    | S3
    |--------------------------------------------------------------------------
    |
    | S3 disk interacts with a bucket on aws s3
    |
    */
    s3: {
      driver: 's3',
      key: Env.get('S3_KEY'),
      secret: Env.get('S3_SECRET'),
      bucket: Env.get('S3_BUCKET'),
      region: Env.get('S3_REGION')
    },

    /*
    |--------------------------------------------------------------------------
    | Azure
    |--------------------------------------------------------------------------
    |
    | Azure disk interacts with a container on Azure blob storage
    |
    */
      azure: {
        driver: 'azure', // Required
        container: Env.get('AZURE_CONTAINER') ,// Required

        // There is 4 diffent way to connect to blob storage shown below

        // 1. Either SAS or use `UseDevelopmentStorage=true` for local development
        connection_string: Env.get('AZURE_CONNECTION_STRING'),
      }
    }
}
