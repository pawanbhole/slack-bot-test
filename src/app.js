
if(!process.env.secretsFilePath) {
	process.env.secretsFilePath='../secrets.json';
}
var fs = require('fs');
var secrets = JSON.parse(fs.readFileSync(process.env.secretsFilePath, 'utf8'));
process.env.clientId=secrets.clientId;
process.env.clientSecret=secrets.clientSecret;
process.env.clientSigningSecret=secrets.clientSigningSecret;


import SlackBot from './components/SlackBot';
import Logger from './components/Logger';
require('./components/ErrorToJSONPolyfill');

const logger = new Logger();
const bot = new SlackBot(logger);
export default bot;

