'use strict';

/*
|--------------------------------------------------------------------------
| UserSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */

//Utils
const { users } = require("../data/UserData");
const { usersManager } = require("../data/UserManagerData");
const { usersChannel } = require("../data/UserChannelPartnerData");
const Database = use('Database');
const { userRoles, userStatus } = use('App/Helpers/Globals');
const default_address = '116 W. 69th Street Suite 200';
const default_zip = 57108;

//Models
const PersonalInformation = use('App/Models/PersonalInformation');
const Address = use('App/Models/Address');
const Contact = use('App/Models/Contact');
const UserHasRole = use('App/Models/UserHasRole');
const User = use('App/Models/User');
const ChannelPartner = use('App/Models/ChannelPartner');


class UserSeeder {
  static async run(transaction, customData = []) {
    const trx = transaction || await Database.beginTransaction();
    const data =  customData.length > 0 ? customData : users;
    try {
      for(const iterator in data){
        const userInfo = data[iterator];
        const { email } = userInfo;
        const exist = await User.query().whereRaw('LOWER(email) = ?',[email]).first();

        if(!exist){
          await this.create(userInfo, trx)
          console.log("Created User ",email)
        }else{
          await this.update(exist, userInfo, trx)
          console.log("Updated User ",exist.email)
        }

      }
      await trx.commit();
    } catch (error) {
      if(transaction){
        throw error ;
      }
      await trx.rollback();
    }
  }

  static async addManager(transaction) {
    const trx = transaction || await Database.beginTransaction();
    try {
      for(const userManager of usersManager){
        const { user_email, manager_email } = userManager;

        if ( !user_email || !manager_email) continue;

        const currentUser = await User.query().whereRaw('LOWER(email) = ?',[user_email.toLowerCase()]).first();
        const manager = await User.query().whereRaw('LOWER(email) = ?',[manager_email.toLowerCase()]).first();
        
        if(currentUser && manager){
          currentUser.merge({ 'manager_id': manager.id }, trx);
          await currentUser.save(trx);
        }
      }
      await trx.commit();

    } catch (error) {
      if(transaction){
        throw error ;
      }
      await trx.rollback();
    }
  }

  static async addChannelPartner(transaction) {
    const trx = transaction || await Database.beginTransaction();
    try {
      for(const userChannelPartner of usersChannel){
        const { user_email, channel_email } = userChannelPartner;

        const currentUser = await User.query().whereRaw('LOWER(email) = ?',[user_email.toLowerCase()]).first();
        const channelUser = await User.query().whereRaw('LOWER(email) = ?',[channel_email.toLowerCase()]).first();
     
        if(currentUser && channelUser){
          await ChannelPartner.create({
            referee_id : currentUser.id,
            referral_id: channelUser.id
          },trx);
        }
      }

      await trx.commit();

    } catch (error) {
      if(transaction){
        throw error ;
      }
      await trx.rollback();
    }
  }

  static async create(data, trx){
    const {  
      email,
      initials,
      first_name,
      last_name,
      phone,
      ext,
      role,
      status,
      address,
      zip,
      job_title
    } = data
    const address_data = await this.getAddress(address,zip);

    const contact = await Contact.create({phone,ext},trx)
    const personalInformation = await PersonalInformation.create({ 
      first_name,
      last_name,
      contact_id: contact.id,
      address_id:address_data.id
    },trx)
    const user = await User.create({
      email,
      initials,
      personal_information_id: personalInformation.id,
      user_status_id: status || userStatus.Active,
      job_title
    },trx)
    await UserHasRole.create({
      role_id : role || userRoles.Recruiter,
      user_id: user.id
    },trx)
  }

  static async update(user, data, trx){
    const {      
      initials,
      first_name,
      last_name,
      phone,
      ext,
      status,
      address,
      zip,
      job_title
    } = data

    const personalInformation = await user.personalInformation().fetch()
    const contact = await personalInformation.contact().fetch()
    const address_data = await this.getAddress(address,zip);

    await contact.merge({
      phone,
      ext
    },trx);
    await contact.save(trx);

    await personalInformation.merge({
      first_name,
      last_name,
      address_id:address_data.id
    },trx);
    await personalInformation.save(trx);

    await user.merge({
      initials,
      user_status_id: status || userStatus.Active,
      job_title
    },trx);
    await user.save(trx);
  }

  static async getAddress(address,zip){
    const query =  Address.query();
    query.where('address',address || default_address);
    (address === 'Remote' && !zip) ? query.whereRaw('city_id is null') : query.where('zip',zip || default_zip);
    return await query.first()
  }
}

module.exports = UserSeeder;
