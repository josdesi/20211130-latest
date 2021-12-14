'use strict';
const path = require('path');
/*
|--------------------------------------------------------------------------
| Providers
|--------------------------------------------------------------------------
|
| Providers are building blocks for your Adonis app. Anytime you install
| a new Adonis specific package, chances are you will register the
| provider here.
|
*/
const providers = [
  '@adonisjs/framework/providers/AppProvider',
  '@adonisjs/auth/providers/AuthProvider',
  '@adonisjs/bodyparser/providers/BodyParserProvider',
  '@adonisjs/cors/providers/CorsProvider',
  '@adonisjs/lucid/providers/LucidProvider',
  '@adonisjs/validator/providers/ValidatorProvider',
  '@adonisjs/drive/providers/DriveProvider',
  '@adonisjs/lucid/providers/MigrationsProvider',
  'adonis-drive-azure-storage/providers/DriveProvider',
  'adonis-jsonable/providers/JsonableProvider',
  path.join(__dirname, '..', 'providers', 'ArrayOfDatesValidationProvider'),
  path.join(__dirname, '..', 'providers', 'UniqueIfValidationRule'),
  path.join(__dirname, '..', 'providers', 'UniqueCaseInsensitiveRule'),
  path.join(__dirname, '..', 'providers', 'UniqueIfCaseInsensitiveRule'),
  path.join(__dirname, '..', 'providers', 'LowerCase'),
  path.join(__dirname, '..', 'providers', 'UniqueCaseInsensitivePersonalEmailRule'),
  path.join(__dirname, '..', 'providers', 'HelloSign/Provider'),
  path.join(__dirname, '..', 'providers', 'DocuSign/Provider'),
  path.join(__dirname, '..', 'providers', 'Agenda/Provider'),
  path.join(__dirname, '..', 'providers', 'Sendgrid/Provider'),
  'adonis-spreadsheet/providers/SpreadSheetProvider',
  path.join(__dirname, '..', 'providers', 'SendgridEmailValidation/Provider'),
  path.join(__dirname, '..', 'providers', 'BriteVerifyEmailValidation/Provider'),
  path.join(__dirname, '..', 'providers', 'WebSocket/Provider'),
  path.join(__dirname, '..', 'providers', 'Notification/Provider'),
  path.join(__dirname, '..', 'providers', 'NotificationV2/Provider'),
  '@adonisjs/antl/providers/AntlProvider'
];

/*
|--------------------------------------------------------------------------
| Ace Providers
|--------------------------------------------------------------------------
|
| Ace providers are required only when running ace commands. For example
| Providers for migrations, tests etc.
|
*/
const aceProviders = ['@adonisjs/lucid/providers/MigrationsProvider', '@adonisjs/vow/providers/VowProvider'];

/*
|--------------------------------------------------------------------------
| Aliases
|--------------------------------------------------------------------------
|
| Aliases are short unique names for IoC container bindings. You are free
| to create your own aliases.
|
| For example:
|   { Route: 'Adonis/Src/Route' }
|
*/
const aliases = {};

/*
|--------------------------------------------------------------------------
| Commands
|--------------------------------------------------------------------------
|
| Here you store ace commands for your package
|
*/
const commands = ['App/Commands/PostMigrationDatabaseSetup', 'App/Commands/EmailValidationScript', 'App/Commands/PrintContacsDirectorySyncQuery', 'App/Commands/ComputeHashForDocusignEvent', 'App/Commands/PrintSearchInformationUpdateQuery'];

module.exports = { providers, aceProviders, aliases, commands };
