
'use strict'

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

Route
  .group(() => {
    Route.get('/', 'IndustryController.index')
    Route.post('/', 'IndustryController.store').validator("StoreIndustry");
    Route.get('/:id', 'IndustryController.show')
    Route.put('/:id', 'IndustryController.update').validator("UpdateIndustry")
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/industries');

Route
  .group(() => {
    Route.get('/','SpecialtyController.index').validator('GetSpecialties')
    Route.get('/:id/subspecialties', 'SpecialtyController.subspecialties')
      .validator('IdParam')
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/specialties');

Route
  .group(() => {
    Route.get('/','SubspecialtyController.index').validator('GetSpecialties')
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/subspecialties');

Route
  .group(() => {
    Route.get('/', 'PositionController.index')
    Route.get('/commons', 'PositionController.commons')
    Route.post('/commons/changes', 'PositionController.saveCommons').validator("SaveCommonPosition");
    Route.post('/', 'PositionController.store').validator("Position");
    Route.get('/equivalents', 'PositionController.searchEquivalents');
    Route.get('/:id', 'PositionController.show')
    Route.put('/:id', 'PositionController.update').validator("Position")
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/positions');

Route
  .group(() => {
    Route.get("", "StateController.index")
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix("api/v1/states");

  
Route
  .group(() => {
    Route.get("", "CityController.index")
    Route.get("/:id/zips","CityController.zipCodes")
    .validator('IdParam')
    Route.get("/search","CityController.searchByTitle")
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix("api/v1/cities");

Route
  .group(() => {
    Route.get("/", "DigController.index");
    Route.post("/", "DigController.store").validator("SaveDigData");
    Route.get("/byUser/:id", "DigController.getUserDig");
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix("api/v1/digs");  

Route
  .group(() => {
    Route.get("/", "InventoryController.index")
      .validator('InventoryFilters');
    Route.get("/getLastActivity", "InventoryController.getLastActivity").validator('GetLastActivity');
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix("api/v1/inventories");  
