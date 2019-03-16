import request from 'request-promise';
let USERS_CACHE = {};
const GET_USER_CALL_IN_PROGRESS = {};
const RELOAD_USER_CALL_IN_PROGRESS = {};
/*
 * Class to handle user operations
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
		if(USERS_CACHE[userId] != null) {
			//user in cache
			return Promise.resolve(USERS_CACHE[userId]);
		} else if(GET_USER_CALL_IN_PROGRESS[userId]) {
			//user call in progress
			return GET_USER_CALL_IN_PROGRESS[userId];
		} else {
			//Calling API to fetch user info
			const options = {
				url: 'https://slack.com/api/users.info',
				qs: {
					token: process.env.apiToken,  //apiToken is set by user_registration on ./login call
					user: userId,
					include_locale: true
				}
			};
			const newPromise = new Promise((resolve, reject) => {
				this._callRest(options).then((response) => {
					const output = JSON.parse(response);
					if(this.logger.isSillyEnabled()) {
						this.logger.silly('Output of info api:-' + JSON.stringify(output));
					}
					if(output.ok) {
						USERS_CACHE[userId] = output.user;
						resolve(USERS_CACHE[userId]);

						//remove promise from cache as now user object is cached
						delete GET_USER_CALL_IN_PROGRESS[userId];
					} else {
						reject(output.error);
					}
				}).catch((error) => {
					reject(error);
				});
			});
			//put promise in cache so there wont be a duplicate call to API when first call is in progress
			GET_USER_CALL_IN_PROGRESS[userId] = newPromise;
			return newPromise;
		}
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
					USERS_CACHE = {};
					for(let index in output.members) {
						const member = output.members[index];
						USERS_CACHE[member.id] = member;
					}
					resolve(USERS_CACHE);
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
			let matchedUser = this.findInMap(USERS_CACHE, userId, email);
			if(matchedUser) {
				resolve(matchedUser);
			} else {
				this.getAll().then((members) => {
					if(this.logger.isSillyEnabled()) {
						this.logger.silly('Finding by userId:'+userId + ' email:'+email+ ' Output of getAll:-' + JSON.stringify(members));
					}
					matchedUser = this.findInMap(USERS_CACHE, userId, email);
					resolve(matchedUser);
				}).catch((error) => {
					reject(error);
				});
			}
		});
	}

	findInMap(userMap, userId, email) {
		const trimmedUserName = userId ? userId.trim().toUpperCase() :'';
		const trimmedEmail = email ? email.trim().toUpperCase() : '';
		for(let index in userMap) {
			const member = userMap[index];
			if((trimmedUserName || trimmedEmail)
				&& member.real_name
				&& member.profile.email
				&& (!trimmedUserName || trimmedUserName == member.real_name.toUpperCase()) 
				&& (!trimmedEmail || trimmedEmail == member.profile.email.toUpperCase())) {
				return member;
			}
		}
		return null;
	}


	/*
	 * this function is similer to get function which returns the promise object which resolve to user objct.
	 *  1) First it checks if the call for reloading user in progress, if yes then it returns same promise
	 *  2) If not then it checks if there any get call in progress. If yes then it wait for that call to complete and then do reload.
	 *. 3) Last to do reaload it just remove the user object from cache adn call the get. 
	 */
	reload(userId) {
		 if(RELOAD_USER_CALL_IN_PROGRESS[userId]) {
			//reload user call in progress
			return RELOAD_USER_CALL_IN_PROGRESS[userId];
		} else {
			//Calling get to fetch user info
			const newPromise = new Promise((resolve, reject) => {
				const doGetCall = () => {
					delete USERS_CACHE[userId];
					this.get(userId).then((user) => {
						resolve(user);
						delete RELOAD_USER_CALL_IN_PROGRESS[userId];
					}).catch((error) => {
						reject(error);
					});	
				};
				if(GET_USER_CALL_IN_PROGRESS[userId]) {
					//user call in progress. So wait for that call to complete then do second get call.
					GET_USER_CALL_IN_PROGRESS[userId].then(() => {
						doGetCall();
					}).catch((error) => {
						reject(error);
					});
				} else {
					doGetCall();
				}
			});
			//put promise in cache so there wont be a duplicate call to API when first call is in progress
			RELOAD_USER_CALL_IN_PROGRESS[userId] = newPromise;
			return newPromise;
		}
	}

	_callRest(options) {
		return request(options);
	}
}
