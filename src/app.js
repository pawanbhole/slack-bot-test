import SlackBot from './components/SlackBot';
import Logger from './components/Logger';
import I18n from './components/I18n';
require('./components/ErrorToJSONPolyfill');

console.log(process.env);
if(!process.env.secretsFilePath) {
	throw new Error("process.env.secretsFilePath not defined");
} else {
	console.log(process.env.secretsFilePath);
}
var fs = require('fs');
var secrets = JSON.parse(fs.readFileSync(process.env.secretsFilePath, 'utf8'));
console.log(secrets);
process.env.clientId=secrets.clientId;
process.env.clientSecret=secrets.clientSecret;
process.env.clientSigningSecret=secrets.clientSigningSecret
process.env.service_account=secrets.firebase_service_account

const logger = new Logger();
const i18n = new I18n();
const bot = new SlackBot(logger, i18n);
export default bot;

