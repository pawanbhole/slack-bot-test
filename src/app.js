
if(!process.env.secretsFilePath) {
	process.env.secretsFilePath='/home/ec2-user/slack/secrets.json';
}
var fs = require('fs');
var secrets = JSON.parse(fs.readFileSync(process.env.secretsFilePath, 'utf8'));
process.env.clientId=secrets.clientId;
process.env.clientSecret=secrets.clientSecret;
process.env.clientSigningSecret=secrets.clientSigningSecret;
global.service_account=secrets.firebase_service_account;


import SlackBot from './components/SlackBot';
import Logger from './components/Logger';
import I18n from './components/I18n';
require('./components/ErrorToJSONPolyfill');

const logger = new Logger();
const i18n = new I18n();
const bot = new SlackBot(logger, i18n);
export default bot;

