import request from 'request-promise';
let users = {};
const getUserCallInProgress = {};
const reloadUserCallInProgress = {};

/*
 * Class to ahndle user operations
 */
export default class UserManager {


	constructor(logger) {
		this.logger = logger;
	}
	/*
	 * this function returns the promise object which resolve to user objct.
	 *  1) First it checks if user present in cache, if yes then returns the resolved promise with user as resolved value
	 *. 2) If not found in cache then it checks if the call for fetching userInfo in progress, if yes then it returns same promise
	 *  3) Last if there not even a call in progress then it calls the slack API https://api.slack.com/methods/users.info and returns the promise
	 */
	get(userId) {
		if(users[userId] != null) {
			//user in cache
			return Promise.resolve(users[userId]);
		} else if(getUserCallInProgress[userId]) {
			//user call in progress
			return getUserCallInProgress[userId];
		} else {
			//Calling API to fetch user info
			const options = {
				url: 'https://slack.com/api/users.info',
				qs: {
					token: process.env.apiToken,
					user: userId
				}
			};
			const newPromise = new Promise((resolve, reject) => {
				this._callRest(options).then((response) => {
					const output = JSON.parse(response);
					if(this.logger.isSillyEnabled()) {
						this.logger.silly('Output of info api:-' + JSON.stringify(output));
					}
					if(output.ok) {
						users[userId] = output.user;
						resolve(users[userId]);

						//remove promise from cache as now user object is cached
						delete getUserCallInProgress[userId];
					} else {
						reject(output.error);
					}
				}).catch((error) => {
					reject(error);
				});
			});
			//put promise in cache so there wont be a duplicate call to API when first call is in progress
			getUserCallInProgress[userId] = newPromise;
			return newPromise;
		}
	}


	/*
	 * this function returns the promise object which resolve to new IM channel objct.
	 */
	openIMChannel(userId) {
		//Calling API to create IM 
		const options = {
			url: 'https://slack.com/api/im.open',
			qs: {
				token: process.env.apiToken,
				user: userId
			}
		};
		return new Promise((resolve, reject) => {
			this._callRest(options).then((response) => {
				const output = JSON.parse(response);
				if(this.logger.isSillyEnabled()) {
					this.logger.silly('Output of im open api:-' + JSON.stringify(output));
				}
				if(output.ok) {
					resolve(output.channel.id);
				} else {
					reject(output.error);
				}
			}).catch((error) => {
				reject(error);
			});
		});
	}


	/*
	 * this function  sends the message to the user on specified channel.
	 */
	sendMessage(channel, text) {
		//Calling API to create IM 
		const options = {
			url: 'https://slack.com/api/chat.postMessage',
			qs: {
				token: process.env.apiToken,
				channel, 
				text
			}
		};
		return new Promise((resolve, reject) => {
			this._callRest(options).then((response) => {
				const output = JSON.parse(response);
				if(this.logger.isSillyEnabled()) {
					this.logger.silly('Output of chat.postMessage api:-' + JSON.stringify(output));
				}
				if(output.ok) {
					resolve(output.message);
				} else {
					reject(output.error);
				}
			}).catch((error) => {
				reject(error);
			});
		});
	}

	/*
	 * this function returns the promise object which resolve to user objct.
	 *  Also this function always calls slack API https://api.slack.com/methods/users.list and returns the promise
	 */
	getAll() {
		//Calling API to fetch user list
		const options = {
			url: 'https://slack.com/api/users.list',
			qs: {
				token: process.env.apiToken,
				limit: 1000000
			}
		};
		return new Promise((resolve, reject) => {
			this._callRest(options).then((response) => {
				const output = JSON.parse(response);
				if(this.logger.isSillyEnabled()) {
					this.logger.silly('Output of list api:-' + JSON.stringify(output));
				}
				if(output.ok) {
					users = {};
					for(let index in output.members) {
						const member = output.members[index];
						users[member.id] = member;
					}
					resolve(output.members);
				} else {
					reject(output.error);
				}
			}).catch((error) => {
				reject(error);
			});
		});
	}

	find(userId, email) {
		return new Promise((resolve, reject) => {
			this.getAll().then((members) => {
				if(this.logger.isSillyEnabled()) {
					this.logger.silly('Finding by userId:'+userId + ' email:'+email+ ' Output of getAll:-' + JSON.stringify(members));
				}
				for(let index in members) {
					const member = members[index];
					if((userId || email) && (!userId || userId == member.id) && (!email || email == member.profile.email)) {
						resolve(member);
						break;
					}
				}
				resolve(null);
			}).catch((error) => {
				reject(error);
			});
		});
	}


	/*
	 * this function is similer to get function which returns the promise object which resolve to user objct.
	 *  1) First it checks if the call for reloading user in progress, if yes then it returns same promise
	 *  2) If not then it checks if there any get call in progress. If yes then it wait for that call to complete and then do reload.
	 *. 3) Last to do reaload it just remove the user object from cache adn call the get. 
	 */
	reload(userId) {
		 if(reloadUserCallInProgress[userId]) {
			//reload user call in progress
			return reloadUserCallInProgress[userId];
		} else {
			//Calling get to fetch user info
			const newPromise = new Promise((resolve, reject) => {
				const doGetCall = () => {
					delete users[userId];
					this.get(userId).then((user) => {
						resolve(user);
						delete reloadUserCallInProgress[userId];
					}).catch((error) => {
						reject(error);
					});	
				};
				if(getUserCallInProgress[userId]) {
					//user call in progress. So wait for that call to complete then do second get call.
					getUserCallInProgress[userId].then(() => {
						doGetCall();
					}).catch((error) => {
						reject(error);
					});
				} else {
					doGetCall();
				}
			});
			//put promise in cache so there wont be a duplicate call to API when first call is in progress
			reloadUserCallInProgress[userId] = newPromise;
			return newPromise;
		}
	}

	_callRest(options) {
		return request(options);
	}
}
