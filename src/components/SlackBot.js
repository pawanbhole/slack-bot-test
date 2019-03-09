import Botkit from 'botkit';
import express from 'express';
import UserManager from './UserManager';
import ChannelManager from './ChannelManager';
import RegistrationManager from './RegistrationManager';

/*
 * Class to ahndle user operations
 */
export default class SlackBot {

	constructor(logger, i18n) {
		this.logger = logger;
		this.i18n = i18n;
		this.userManager = new UserManager(logger);
		this.channelManager = new ChannelManager(logger);
		this.registrationManager = new RegistrationManager(logger, this.userManager, this.channelManager);
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

		controller.hears('.*','direct_message,direct_mention,mention,ambient', (bot, message) => {
		  this.logger.debug('direct_message', message);
		  this.checkIfUserMentioned(message, bot);
		  //bot.reply(message,'Howdy!');
		});
	}

	checkIfUserMentioned(message, bot) {
		const text = message.text;
		if(text) {
			const matchedUsers = text.match(/<@\w*>/g);
			if(this.logger.isSillyEnabled()) {
				this.logger.silly('message:-' + text+' patterns:'+ JSON.stringify(matchedUsers));
			}
			for(let userMention in matchedUsers) {
				const mentionedUserId = matchedUsers[userMention].substr(2, matchedUsers[userMention].length - 3);
				const mentioningUserId = message.user;
				const channelId = message.channel;
				if(this.logger.isDebugEnabled()) {
					this.logger.debug('mentioningUserId:-' + mentioningUserId + ' mentionedUserId:-'+ mentionedUserId);
				}
				if(mentioningUserId != mentionedUserId) {
					Promise.all([
						this.userManager.get(mentioningUserId), 
						this.userManager.get(mentionedUserId), 
						this.channelManager.get(channelId)
						]).then((results) => {
						if(this.logger.isSillyEnabled()) {
							this.logger.silly('Output of get user and channel:-' + JSON.stringify(results));
						}
						this.notifyIfSubscribed(results[0], results[1], results[2], message, bot).then(() => {
							if(this.logger.isDebugEnabled()) {
								this.logger.debug(' mentionedUserId:-'+ mentionedUserId + ' notified.');
							}
						}).catch((error) => {
							this.logger.error("Error while notifying user info for id "+mentionedUserId+' Error:- '+JSON.stringify(error));
						});
					}).catch((error) => {
						this.logger.error("Error while fetching user info for id "+mentionedUserId+" or "
							+mentioningUserId + ' Error:- '+JSON.stringify(error));
					});
				}
			}
		}
	}

	notifyIfSubscribed(mentioningUser, mentionedUser, channel, message, bot) {
		if(this.logger.isDebugEnabled()) {
			this.logger.debug(mentioningUser.name + ' was looking for '+ mentionedUser.name);
		}
		return new Promise((resolve, reject) => {
			this.registrationManager.isRegisteredForNotifications(mentionedUser.id).then((tokens) => {
				if(tokens && tokens.length > 0) {
					const notificationMsg = this.i18n.localized('slack_mention', {from: mentioningUser.real_name, to: mentionedUser.real_name, channel: channel.name});
					const notificationHeader = this.i18n.localized('slack_mention_header');
					const replyMsg = this.i18n.localized('slack_reply', {from: mentioningUser.real_name, to: mentionedUser.real_name, channel: channel.name});
					if(this.logger.isDebugEnabled()) {
						this.logger.debug('notifying :'+mentionedUser.name+' : "'+notificationMsg+'"');
					}
					if(this.logger.isDebugEnabled()) {
						this.logger.debug('replying :'+mentioningUser.name+' : "'+replyMsg+'"');
					}
					const notifyUserForMentionPromises = [];
					tokens.forEach((token) => {
						notifyUserForMentionPromises.push(this.registrationManager.notifyUserForMention(notificationHeader, notificationMsg, token));
					});
					this.afterAtleastOneSuccess(notifyUserForMentionPromises).then((notification) => {
						//TODO we can remove the tokens for which notification is failed
						bot.reply(message, replyMsg);
						resolve(notification);
					}).catch((error) => {
						reject(error);
					});
				} else {
					this.logger.debug("notifications not enabled by user :"+mentioningUser.name);
					resolve();
				}
			}).catch((error) => {
				reject(error);
			});
		});
	}

	afterAtleastOneSuccess(promises) {
		let successCount = 0, errorCount = 0;
		const totalPromises = promises.length;
		const errors = [];
		return new Promise((resolve, reject) => {
			promises.forEach((currentPromise) => {
				currentPromise.then(() => {
					successCount++;
					if((successCount + errorCount) == totalPromises) {
						resolve(successCount);	
					}
				}).catch((error) => {
					if(this.logger.isSillyEnabled()) {
						this.logger.silly('Optional promise failed with error: '+JSON.stringify(error));
					}
					errorCount++;
					errors.push(error);
					if((successCount + errorCount) == totalPromises) {
						if(successCount > 0) {
							resolve(successCount);	
						} else {
							reject(errors);
						}
					}
				});
			});
		});
	}

	createWebhookForNotification(webserver) {
        webserver.post('/slackbot/authenticate', (req, res) => {
        	this.registrationManager.authenticateUserHandler(req, res);
        });
        webserver.post('/slackbot/validate-secret-code', (req, res) => {
        	this.registrationManager.validateSecretCodeHandler(req, res);
        });
        webserver.post('/slackbot/register-token', (req, res) => {
        	this.registrationManager.registerTokenHandler(req, res);
        });
        webserver.use('/', express.static('./static'))
    }
}