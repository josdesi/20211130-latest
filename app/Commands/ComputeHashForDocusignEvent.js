'use strict'

const { Command } = require('@adonisjs/ace')
const fs = require('fs');
const DocuSign = use('Services/DocuSign');
class ComputeHashForDocusignEvent extends Command {
  static get signature () {
    return 'compute:hash:for:docusign:event {--targetFile=@value}'
  }

  static get description () {
    return 'Compute hash for docusign event payload'
  }

  async handle (args, options) {
    const { targetFile } = options;
    const payload = fs.readFileSync(targetFile);
    const hash = DocuSign.computeHashForExternalPayload(payload);
    console.log('Computed hash: ', hash);
  }
}

module.exports = ComputeHashForDocusignEvent
