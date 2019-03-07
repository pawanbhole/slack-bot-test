import SlackBot from './SlackBot';
import Logger from './Logger';
import I18n from './I18n';

const logger = new Logger();
const i18n = new I18n();

logger.log("info", "aaaaaa", {a:1}, {b:2},{c:3});
console.log(i18n.localized('slack_mention'));
//const bot = new SlackBot(logger, i18n);
