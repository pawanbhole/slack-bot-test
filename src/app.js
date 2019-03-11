import SlackBot from './components/SlackBot';
import Logger from './components/Logger';
import I18n from './components/I18n';
require('./ErrorToJSONPolyfill');

const logger = new Logger();
const i18n = new I18n();
const bot = new SlackBot(logger, i18n);
export default bot;