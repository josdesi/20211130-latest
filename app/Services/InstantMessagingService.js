'use strict';

const axios = require('axios');
const appInsights = require('applicationinsights');
const Config = use('Adonis/Src/Config');
const Antl = use('Antl');
const ModulePresetsConfigRepository = use('App/Helpers/ModulePresetsConfigRepository');

class InstantMessagingService {
  constructor() {
    const config = Config.get('instantMessaging');
    this.baseUrl = config.baseUrl;
    this.moduleConfigRepository = new ModulePresetsConfigRepository();
  }

  async sendMessage({ configKeys, title, text, customParams = {} }) {
    try {
      const senderConfigKey = 'userGlipForWebHookMsg';
      const senderConfig = await this.moduleConfigRepository.getById(senderConfigKey);
      if (!senderConfig) throw Antl.formatMessage('messages.configuration.noKey', { key: senderConfigKey });
      const { name, iconUrl } = senderConfig.data;
      const payload = {
        title,
        text,
        activity: name,
        iconUri: iconUrl,
        ...customParams
      };

      const postPromises = configKeys.map(configKey => this.postToGlip(configKey, payload));
      await Promise.all(postPromises);
      
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async postToGlip(configKey, payload){
    const messageConfig = await this.moduleConfigRepository.getById(configKey);
    if (!messageConfig) throw Antl.formatMessage('messages.configuration.noKey', { key: configKey });
    const { groupId } = messageConfig.data;

    const endpoint = `${this.baseUrl}/${groupId}`;
    const response = await axios.post(endpoint, payload);
    if (response.status !== 200) throw `Error ${response.status} when invoking ${endpoint}`;
  }
}

module.exports = InstantMessagingService;
