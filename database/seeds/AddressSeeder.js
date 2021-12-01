'use strict';

/*
|--------------------------------------------------------------------------
| AddressSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Adress = use('App/Models/Address');
const ZipCode = use('App/Models/ZipCode');
const City = use('App/Models/City');
const State = use('App/Models/State');
const Country = use('App/Models/Country');

class AddressSeeder {
  static async run(transaction) {
    const adresses = [
      { city: 'sioux falls', address: '116 W. 69th Street Suite 200', state: 'SD', zip: '57108' , country:'US' },
      { city: 'glendale', address: '6751 N. Sunset Boulevard Suite E290', state: 'AZ', zip: '85305' , country:'US'},
      { city: 'reno', address: 'Mountain View 5470 Kietzke Lane', state: 'NV', zip: '89511' , country:'US'},
      { city: 'denver', address: '3457 Ringsby Court Suite 111', state: 'CO', zip: '80216' , country:'US'},
      { city: 'nashville', address: '2026 Lindell Avenue', state: 'TN', zip: '37203' , country:'US'},
      { city: 'coon rapids', address: '277 Coon Rapids Blvd Suite 309', state: 'MN', zip: '55433' , country:'US'},
      { city: 'leon', address: 'Blvd Aeropuerto 849', state: 'GTO', zip: '37545' , country:'MX'},
      { city: null, address: 'Remote', state: null, zip: null , country: null},
    ];
    for(const add of adresses){
      let city = null;
      let country = null;
      let state = null;
      let zipCode = null;
      let coordinates = null;
      if(add.address !== 'Remote'){
        country = await Country.findBy('slug',add.country);
        state = await State.findBy('slug',add.state);
        city = await City.query().where('state_id',state.id).whereRaw('LOWER(title)=?',[add.city]).first();
        zipCode = await ZipCode.query().where('city_id',city.id).where('zip_ch',add.zip).first();
        coordinates =  `(${zipCode.longitude},${zipCode.latitude})`;
      }
      const exist = await Adress.query().where('address',add.address).where('city_id',city ? city.id : null).where('zip',zipCode ? zipCode.zip : null).first();
      if(exist){
        continue;
      }
      await Adress.create({
        city_id: city ? city.id : null,
        zip: zipCode ? zipCode.zip : null,
        coordinates,
        address: add.address
      },transaction)
    }

  }
}

module.exports = AddressSeeder;
