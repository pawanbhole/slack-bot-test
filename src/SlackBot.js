import Botkit from 'botkit';
import UserManager from './UserManager';


/*
 * Class to ahndle user operations
 */
export default class SlackBot {

	constructor() {
		const userInfo = new UserManager();

		userInfo.get('UGS4BHFKR').then((user) => {
		  console.log("call 1")
		  console.log(user)

		});
		userInfo.get('UGS4BHFKR').then((user) => {
		  console.log("call 2")
		  console.log(user)
		  userInfo.get('UGS4BHFKR').then((user) => {
		    console.log("call 3")
		    console.log(user)
		  }); 
		});


		userInfo.reload('UGS4BHFKR').then((user) => {
		  console.log("call 2")
		  console.log(user)
		});

		userInfo.reload('UGS4BHFKR').then((user) => {
		  console.log("call 2")
		  console.log(user)
		  userInfo.reload('UGS4BHFKR').then((user) => {
		    console.log("call 3")
		    console.log(user)
		  }); 
		});
		/*

		var bot_options = {
		    clientId: process.env.clientId,
		    clientSecret: process.env.clientSecret,
		    clientSigningSecret: process.env.clientSigningSecret,
		    // debug: true,
		    scopes: ['bot']
		};

		bot_options.json_file_store = __dirname + '/.data/db/'; 

		var controller = Botkit.slackbot(bot_options);
		controller.startTicking();

		controller.setupWebserver(process.env.port,function(err,webserver) {
		    controller.createWebhookEndpoints(controller.webserver);
		    controller.createOauthEndpoints(controller.webserver);
		});

		controller.hears('.*','direct_message', function(bot, message) {
		  console.log('\n\ndirect_message:--------------------------------------------------')
		  console.log(message)
		  bot.reply(message,'direct_message Howdy!');
		});


		controller.hears('.*','direct_mention', function(bot, message) {
		  console.log('\n\ndirect_mention:--------------------------------------------------')
		  console.log(message)
		  bot.reply(message,'direct_mention Howdy!');
		});


		controller.hears('.*','mention', function(bot, message) {
		  console.log('\n\nmention:--------------------------------------------------')
		  console.log(message)
		  bot.reply(message,'mention Howdy!');
		});

		controller.hears('.*','ambient', function(bot, message) {
		  console.log('\n\nambient:--------------------------------------------------')
		  console.log(message)
		  bot.reply(message,'ambient Howdy!');
		});

		*/
	}
}





