import Botkit from 'botkit';
import express from 'express';
import ChannelManager from './ChannelManager';
import UserManager from './UserManager';

/*
 * Slack bot class.
 */
export default class SlackBot {

  constructor(logger) {
    this.logger = logger;
    var bot_options = {
        clientId: process.env.clientId,
        clientSecret: process.env.clientSecret,
        clientSigningSecret: process.env.clientSigningSecret,
        debug: true,
        scopes: ['bot'],
        logger
    };
    this.channelManager = new ChannelManager(logger);
    this.userManager = new UserManager(logger);
    bot_options.json_file_store = process.env.fileStore;
    var controller = Botkit.slackbot(bot_options);
    controller.startTicking();

    // Set up an Express-powered webserver to expose oauth and webhook endpoints
    var webserver = require('../slackcomponents/express_webserver.js')(controller);

    // Set up a simple storage backend for keeping a record of customers
    // who sign up for the app via the oauth
    require('../slackcomponents/user_registration.js')(controller);

    // Send an onboarding message when a new team joins
    require('../slackcomponents/onboarding.js')(controller);

    this.createWebhook(controller.webserver);
    
    //Listening to all message events.
    controller.hears('.*','direct_message,direct_mention,mention,ambient', (bot, message) => {
      this.logger.debug('direct_message', message);
      this.forwardMessage(message, bot);
    });
  }


  /*
   * We are using sme express server started by botkit to host registration API, notification react widget and dummy website.
   */
  createWebhook(webserver) {
        webserver.use('/', express.static('./static'))
    }

  /*
   * It checks if any user is mentioned in current message by using reguler expression.
   * If user is mentioned then it checks if that user has registered for notifications. If registered then sends the notification.
   */
  forwardMessage(message, bot) {
    console.log("\n\n\nMessage:-" + JSON.stringify(message));
    bot.reply(message, `Echo: ${ message.text }`);
    //const cp =  this.channelManager.get(message.channel);
    const up =  this.userManager.get(message.user);
    Promise.all([up]).then((userInfos) => {
        //console.log("\nchannleInfo:-" + JSON.stringify(channleInfo));
        const userInfo = userInfos.length > 0 ? userInfos[0] : {};
        console.log("\nuserInfo:-" + JSON.stringify(userInfo));

        const payload = {
            channelId: message.channel,
            //channelName: channleInfo.channel.name,
            userId:message.user,
            username: userInfo.name,
            time: message.ts,
            message: message.text
        };
        console.log("\npayload:-" + JSON.stringify(payload));

     }).catch((error) => {
        console.error("error while forwarding message", error);
     });
  }

}





/*
Sample message from hangout


{
  "token": "eNUMIzEmPY6dMB1NMM755z1b",
  "team_id": "TPENYK07J",
  "api_app_id": "AQ4KZULKT",
  "event": {
    "client_msg_id": "4bd9c192-a629-4ccc-87d9-0627c3527ffe",
    "type": "message",
    "text": "hi",
    "user": "UQ3KV7PEU",
    "ts": "1573400358.000800",
    "team": "TPENYK07J",
    "channel": "DQC4J14GL",
    "event_ts": "1573400358.000800",
    "channel_type": "im"
  },
  "type": "direct_message",
  "event_id": "EvQCN0TU4D",
  "event_time": 1573400358,
  "authed_users": [
    "UQ3KV7PEU"
  ],
  "raw_message": {
    "token": "eNUMIzEmPY6dMB1NMM755z1b",
    "team_id": "TPENYK07J",
    "api_app_id": "AQ4KZULKT",
    "event": {
      "client_msg_id": "4bd9c192-a629-4ccc-87d9-0627c3527ffe",
      "type": "message",
      "text": "hi",
      "user": "UQ3KV7PEU",
      "ts": "1573400358.000800",
      "team": "TPENYK07J",
      "channel": "DQC4J14GL",
      "event_ts": "1573400358.000800",
      "channel_type": "im"
    },
    "type": "event_callback",
    "event_id": "EvQCN0TU4D",
    "event_time": 1573400358,
    "authed_users": [
      "UQ3KV7PEU"
    ]
  },
  "_pipeline": {
    "stage": "receive"
  },
  "client_msg_id": "4bd9c192-a629-4ccc-87d9-0627c3527ffe",
  "text": "hi",
  "user": "UQ3KV7PEU",
  "ts": "1573400358.000800",
  "team": "TPENYK07J",
  "channel": "DQC4J14GL",
  "event_ts": "1573400358.000800",
  "channel_type": "im",
  "events_api": true,
  "match": [
    "hi"
  ]
}


*/