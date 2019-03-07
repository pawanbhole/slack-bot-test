if (!('toJSON' in Error.prototype))
Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
        var alt = {};

        Object.getOwnPropertyNames(this).forEach(function (key) {
            alt[key] = this[key];
        }, this);

        return alt;
    },
    configurable: true,
    writable: true
});

import SlackBot from './SlackBot';
import Logger from './Logger';
import I18n from './I18n';

const logger = new Logger();
const i18n = new I18n();

logger.log("info", "aaaaaa", {a:1}, {b:2},{c:3});
console.log(i18n.localized('slack_mention'));
const bot = new SlackBot(logger, i18n);

export default bot;