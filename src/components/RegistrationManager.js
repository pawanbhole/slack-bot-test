import RegistrationStore from './store/RegistrationStore';
import request from 'request-promise';
import {JWT}  from 'google-auth-library';
import serviceAccountKey from '../service-account.json';

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

//last access token of google firebase api. Expires after one hour.
let lastAccessToken;

/*
 * Class to handle registration
 */
export default class RegistrationManager {

	constructor(logger, userManager, channelManager, i18n) {
		this.logger = logger;
		this.userManager = userManager;
		this.channelManager = channelManager;
		this.i18n = i18n;
		this.registrationStore = new RegistrationStore(logger);
	}

	_callRest(options) {
		return request(options);
	}

	/*
	 * Returns the promise which resolves to token if user is registered. Else resolves to false.
	 */
	isRegisteredForNotifications(userId) {
		if(this.logger.isDebugEnabled()) {
			this.logger.debug("Checking if "+userId+" registered for notifications.");
		}
		return new Promise((resolve, reject) => {
			this.registrationStore.get(userId).then((registration) => {
				if(registration && registration.tokens) {
					if(this.logger.isDebugEnabled()) {
						this.logger.debug(userId+" registered for notifications.");
					}
					resolve(registration.tokens);
				} else {
					if(this.logger.isDebugEnabled()) {
						this.logger.debug(userId+" not registered for notifications.");
					}
					resolve(false);
				}
			}).catch((error) => {
				reject(error);
			});
		});
	}


	/*
	 * Returns the promise which resolves to the access token. It also cache the access token which is refreshed after one hour.
	 */
	getAccessToken() {
	  return new Promise(function(resolve, reject) {
	  	//check the timestamp. if token older than one hour refresh it.
	  	if(lastAccessToken && lastAccessToken.timestamp > ((new Date()).getTime()-3600000)) {
		      resolve(lastAccessToken.access_token);
		} else {
			var jwtClient = new JWT(
				serviceAccountKey.client_email,
				null,
				serviceAccountKey.private_key,
				SCOPES,
				null);
		    jwtClient.authorize(function(err, tokens) {
		    	if (err) {
		    		reject(err);
		    		return;
		    	}
		    	lastAccessToken = {access_token:tokens.access_token, timestamp: (new Date).getTime()};
		      	resolve(lastAccessToken.access_token);
		    });
		}
	  });
	}


	/*
	 *  Notifying user that someone is looking for him on slack
	 */
	notifyUserForMention(notificationHeader, notificationMsg, token) {
		return new Promise((resolve, reject) => {
			this.getAccessToken().then((accessToken) => {
				const options = {
					headers: {
						"Content-Type": "application/json",
						"Authorization": " Bearer "+accessToken
					}, 
					url: 'https://fcm.googleapis.com/v1/projects/slackbotpushn/messages:send',
					json:{
					  "message":{
					    token,
					    "notification" : {
					      "body" : notificationMsg,
					      "title" : notificationHeader
					    }
					   }
					}, 
					method: 'POST'
				};
				this._callRest(options).then((response) => {
					resolve(response);
				}).catch((error) => {
					reject(error);
				});
			}).catch((error) => {
				reject(error);
			});
		});
	}


	/*
	 * POST REST api handler which accepts the user name or email and respond back if it matches with some user. 
	 * It also send the 4 digit pin to slack account of that user.
	 */
	authenticateUserHandler(req, res) {
        this.userManager.find(req.body.userId, req.body.email).then((user) => {
			if(this.logger.isSillyEnabled()) {
				this.logger.silly('authenticateUser Output of find:-' + JSON.stringify(user));
			}
			if(user) {
				const userId = user.id;
				this.registrationStore.get(userId).then((result) => {
					let registrationObject,registrationObjectNew;
					if(result) {
						if(this.logger.isDebugEnabled()) {
							this.logger.debug('authenticateUserHandler For '+userId+' registrationObject already exist: '+JSON.stringify(registrationObject));
						}
						registrationObjectNew = false;
						registrationObject = result;
					} else {
						if(this.logger.isDebugEnabled()) {
							this.logger.debug('authenticateUserHandler For '+userId+' registrationObject does not exist.');
						}
						//If this is first time user is registering for notifications then there wont be any record in database.
						//So if registrationObjectNew is true then create funct of store will be called. else update.
						registrationObjectNew = true;
						registrationObject = {};
					}
					//Random 4 digit secret code
					const secretCode = (Math.floor(Math.random() * 10000) + 10000).toString().substr(1);
					registrationObject.secretCode = secretCode;
					registrationObject.secretCodeRetry = 0;
					//Secret code is sent o slack account of the user
					this.sendSecretCodeToUser(user, secretCode).then(() => { 
						if(this.logger.isDebugEnabled()) {
							this.logger.debug('authenticateUserHandler For '+userId+' secret code sent.');
						}
						this.registrationStore[registrationObjectNew ? 'create' : 'update'](userId, registrationObject).then(() => {
				            res.status(200);
				  			res.send({success:true, message: 'Secret code sent to the user.'});
						}).catch((error) => {
							this.logger.error('Error while persisting registrationObject for user id:'+user.id + ' Error:- '+JSON.stringify(error));
				            res.status(500);
				  			res.send({success:false, message: 'Error while authenticating user.'});
						});
					}).catch((error) => {
						this.logger.error('Error while sending code to user id:'+user.id + ' Error:- '+JSON.stringify(error));
			            res.status(500);
			  			res.send({success:false, message: 'Error while sending code to the user.'});
					});
				}).catch((error) => {
					this.logger.error('Error while reading registrationObject for user id:'+user.id + ' Error:- '+JSON.stringify(error));
		            res.status(500);
		  			res.send({success:false, message: 'Error while authenticating user.'});
				});
			} else {
				this.logger.error("User not found for id:"+req.body.userId+" or  email:" +req.body.email);
	            res.status(404);
	  			res.send({success:false, message: 'User not found.'});
			}
		}).catch((error) => {
			this.logger.error("Error while searching user info for id:"+req.body.userId+" or  email:"
				+req.body.email + ' Error:- '+JSON.stringify(error));
            res.status(500);
  			res.send({success:false, message: 'Error while searching the user.'});
		});
	}


	/*
	 * POST REST api handler which accepts the user name or email snf secretCOde and then respond back if the code is vaild or not. 
	 * It allows configurable number retries default to 3.
	 */
	validateSecretCodeHandler(req, res) {
        this.userManager.find(req.body.userId, req.body.email).then((user) => {
			if(this.logger.isSillyEnabled()) {
				this.logger.silly('authenticateUser Output of find:-' + JSON.stringify(user));
			}
			if(user) {
				const userId = user.id;
				this.registrationStore.get(userId).then((registrationObject) => {
					if(registrationObject && registrationObject.secretCode) {
						if(this.logger.isDebugEnabled()) {
							this.logger.debug('validateSecretCodeHandler For '+userId);
						}
						let message, limitExceed = false, success = false;
						let secterCodeRetryMaxCount = process.env.secterCodeRetryMaxCount;
						if(secterCodeRetryMaxCount === null || secterCodeRetryMaxCount === undefined || secterCodeRetryMaxCount < 0) {
							secterCodeRetryMaxCount = 3; //default to 3 max retries
						}
						if(req.body.secretCode == registrationObject.secretCode) {
							message ='Authentication successful.';
							success = true;
						} else if(registrationObject.secretCodeRetry >= secterCodeRetryMaxCount) {
							registrationObject.secretCode = null;
							registrationObject.secretCodeRetry = null;
							this.logger.error("Registration retry exceeded the limit of user id:"+user.id);
					        message = 'Registration retry limit exceeded.';
					        limitExceed = true;
						} else {
							registrationObject.secretCodeRetry += 1;
							this.logger.error("Registration retry count is "+registrationObject.secretCodeRetry+" for user id:"+user.id);
					        message = 'Invalid code.';
						}
						this.registrationStore.update(userId, registrationObject).then(() => {
				            res.status(200);
				  			res.send({success, message, limitExceed});
						}).catch((error) => {
							this.logger.error('Error while persisting registrationObject for user id:'+user.id + ' Error:- '+JSON.stringify(error));
				            res.status(500);
				  			res.send({success:false, message: 'Error whilxe validating secret code.'});
						});
					} else {
						this.logger.error("Authentication process not started for user id:"+user.id);
						res.status(400);
					  	res.send({success:false, message: 'Authentication process not started.'});
					}
				}).catch((error) => {
					this.logger.error('Error while reading registrationObject for user id:'+user.id + ' Error:- '+JSON.stringify(error));
		            res.status(500);
		  			res.send({success:false, message: 'Error while authenticating user.'});
				});
			} else {
				this.logger.error("User not found for id:"+req.body.userId+" or  email:" +req.body.email);
	            res.status(404);
	  			res.send({success:false, message: 'User not found.'});
			}
		}).catch((error) => {
			this.logger.error("Error while searching user info for id:"+req.body.userId+" or  email:"
				+req.body.email + ' Error:- '+JSON.stringify(error));
            res.status(500);
  			res.send({success:false, message: 'Error while searching the user.'});
		});
	}



	/*
	 * POST REST api handler which accepts the user name or email, secretCode and firebase messaging token and stores it in database. 
	 */
	registerTokenHandler(req, res) {
        this.userManager.find(req.body.userId, req.body.email).then((user) => {
			if(this.logger.isSillyEnabled()) {
				this.logger.silly('authenticateUser Output of find:-' + JSON.stringify(user));
			}
			if(user) {
				const userId = user.id;
				this.registrationStore.get(userId).then((registrationObject) => {
					if(registrationObject && registrationObject.secretCode && req.body.secretCode == registrationObject.secretCode && req.body.token) {
						if(this.logger.isDebugEnabled()) {
							this.logger.debug('registerTokenHandler For '+userId);
						}
						delete registrationObject.secretCode;
						delete registrationObject.secretCodeRetry;
						registrationObject.tokens = registrationObject.tokens || [];
						registrationObject.tokens.push(req.body.token);
						this.registrationStore.update(userId, registrationObject).then(() => {
				            res.status(200);
				  			res.send({success:true, message: 'Registration successful.'});
						}).catch((error) => {
							this.logger.error('Error while persisting registrationObject for user id:'+user.id + ' Error:- '+JSON.stringify(error));
				            res.status(500);
				  			res.send({success:false, message: 'Error while validating secret code.'});
						});
					} else {
						this.logger.error("Authentication process not started or incomplete for user id:"+user.id);
						res.status(400);
					  	res.send({success:false, message: 'Authentication process not started or incomplete.'});
					}
				}).catch((error) => {
					this.logger.error('Error while reading registrationObject for user id:'+user.id + ' Error:- '+JSON.stringify(error));
		            res.status(500);
		  			res.send({success:false, message: 'Error while authenticating user.'});
				});
			} else {
				this.logger.error("User not found for id:"+req.body.userId+" or  email:" +req.body.email);
	            res.status(404);
	  			res.send({success:false, message: 'User not found.'});
			}
		}).catch((error) => {
			this.logger.error("Error while searching user info for id:"+req.body.userId+" or  email:"
				+req.body.email + ' Error:- '+JSON.stringify(error));
            res.status(500);
  			res.send({success:false, status: 'Error while searching the user.'});
		});
	}


	/*
	 * Returns the promise which resolves once message is sent to user.
	 */
	sendSecretCodeToUser(user, secretCode) {
		return new Promise((resolve, reject) => {
			this.channelManager.openIMChannel(user.id).then((channelId) => {
				const secretCodeText = this.i18n.localized('your_secret_code_is',{secretCode});
	        	this.channelManager.sendMessage(channelId, secretCodeText).then((message) => {
		            resolve(message);
				}).catch((error) => {
					reject(error);
				});    
			}).catch((error) => {
				reject(error);
			});
		});
	}
}