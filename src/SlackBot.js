import Botkit from 'botkit';
import express from 'express';
import UserManager from './UserManager';

const registrations = {};
const registrationCodes = {};
const registrationCodesRetry = {};

/*
 * Class to ahndle user operations
 */
export default class SlackBot {

	constructor(logger, i18n) {
		this.logger = logger;
		this.i18n = i18n;
		this.userInfo = new UserManager(logger);
		var bot_options = {
		    clientId: process.env.clientId,
		    clientSecret: process.env.clientSecret,
		    clientSigningSecret: process.env.clientSigningSecret,
		    // debug: true,
		    scopes: ['bot'],
		    logger
		};

		bot_options.json_file_store = process.env.fileStore; 
		var controller = Botkit.slackbot(bot_options);
		controller.startTicking();

		controller.setupWebserver(process.env.port, (err,webserver) => {
		    controller.createWebhookEndpoints(controller.webserver);
		    controller.createOauthEndpoints(controller.webserver);
		    this.createWebhookForNotification(controller.webserver);
		    this.logger.info("Bot ready to receive messages.")
		});

		controller.hears('.*','direct_message', (bot, message) => {
		  this.logger.debug('direct_message', message);
		  this.checkIfUserMentioned(message);
		  bot.reply(message,'direct_message Howdy!');
		});

		controller.hears('.*','direct_mention', (bot, message) => {
		  this.logger.debug('direct_mention', message);
		  this.checkIfUserMentioned(message);
		  bot.reply(message,'direct_mention Howdy!');
		});


		controller.hears('.*','mention', (bot, message) => {
		  this.logger.debug('mention', message);
		  this.checkIfUserMentioned(message);
		  bot.reply(message,'mention Howdy!');
		});

		controller.hears('.*','ambient', (bot, message) => {
			if(this.logger.isDebugEnabled()) {
		  		this.logger.debug('ambient ' + JSON.stringify(message));
		  	}
		  this.checkIfUserMentioned(message);
		  bot.reply(message,'ambient Howdy!');
		});
	}

	checkIfUserMentioned(message) {
		const text = message.text;
		if(text) {
			const matchedUsers = text.match(/<@\w*>/g);
			if(this.logger.isDebugEnabled()) {
				this.logger.debug('result for pattern in message:-' + text, matchedUsers);
			}
			for(let userMention in matchedUsers) {
				const mentionedUserId = matchedUsers[userMention].substr(2, matchedUsers[userMention].length - 3);
				const mentioningUserId = message.user;
				if(this.logger.isDebugEnabled()) {
					this.logger.debug('mentioningUserId:-' + mentioningUserId + ' mentionedUserId:-'+ mentionedUserId);
				}
				if(mentioningUserId != mentionedUserId) {
					Promise.all([this.userInfo.get(mentioningUserId), this.userInfo.get(mentionedUserId)]).then((users) => {
						if(this.logger.isSillyEnabled()) {
							this.logger.silly('Output of get:-' + JSON.stringify(users));
						}
						this.notifyIfSubscribed(users[0], users[1]);
					}).catch((error) => {
						this.logger.error("Error while fetching user info for id "+mentionedUserId+" or "
							+mentioningUserId + ' Error:- '+JSON.stringify(error));
					});
				}
			}
		}
	}

	notifyIfSubscribed(mentioningUser, mentionedUser) {
		if(this.logger.isDebugEnabled()) {
			this.logger.debug(mentioningUser.name + ' was looking for '+ mentionedUser.name);
		}
	}

	createWebhookForNotification(webserver) {
        var endpoint = '/slackbot/notifyme';
        webserver.post(endpoint, (req, res) => {
            console.log(req.body);
            this.userInfo.find(req.body.userId, req.body.email).then((user) => {
				if(this.logger.isSillyEnabled()) {
					this.logger.silly('Output of find:-' + JSON.stringify(user));
				}
				if(user) {
					if(req.body.code) {
						if(req.body.code == registrationCodes[user.id]) {
							this.registerForNotifications(user, req.body.notificationInfo).then(() => {
					            res.status(200);
					  			res.send({success:true, status: 'REGISTERED'});
							}).catch((error) => {
								this.logger.error("Error while registration of user id:"+user.id + ' Error:- '+JSON.stringify(error));
					            res.status(500);
					  			res.send({success:false, status: 'Error while registrations.'});
							});
						} else if(registrationCodesRetry[user.id] > 3) {
							this.logger.error("Registration retry exceeded the limit of user id:"+user.id);
					        res.status(200);
					  		res.send({success:false, status: 'Registration retry exceeded the limit.', limitExceed: true});
						} else {
							registrationCodesRetry[user.id] += 1;
							this.logger.error("Registration retry count is "+registrationCodesRetry[user.id]+" for user id:"+user.id);
					        res.status(200);
					  		res.send({success:false, status: 'Invalid code.', limitExceed: false});
						}
					} else {
						const code = (Math.floor(Math.random() * 10000) + 10000).toString().substr(1);
						registrationCodes[user.id] = code;
						registrationCodesRetry[user.id] = 0;
						this.sendCodeToUser(user, code).then(() => {
				            res.status(200);
				  			res.send({success:true, status: 'CODE_SENT'});
						}).catch((error) => {
							this.logger.error("Error while sending code to user id:"+user.id + ' Error:- '+JSON.stringify(error));
				            res.status(500);
				  			res.send({success:false, status: 'Error while sending code to the user.'});
						});
					}
				} else {
					this.logger.error("User not found for id:"+req.body.userId+" or  email:"
						+req.body.email);
		            res.status(404);
		  			res.send({success:false, status: 'User not found.'});
				}
			}).catch((error) => {
				this.logger.error("Error while searching user info for id:"+req.body.userId+" or  email:"
					+req.body.email + ' Error:- '+JSON.stringify(error));
	            res.status(500);
	  			res.send({success:false, status: 'Error while searching the user.'});
			});
        });
        webserver.use('/static', express.static('./static'))
	}

	sendCodeToUser(user, code) {
		return new Promise((resolve, reject) => {
			this.userInfo.openIMChannel(user.id).then((channelId) => {
				const codeText = "Your rgistration code is "+code;
	        	this.userInfo.sendMessage(channelId, codeText).then((message) => {
		            resolve(message);
				}).catch((error) => {
					reject(error);
				});    
			}).catch((error) => {
				reject(error);
			});
		});
	}

	registerForNotifications(user, notificationInfo) {
		return new Promise((resolve, reject) => {
			
		});
	}
}