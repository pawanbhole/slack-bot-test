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


/*



[
  {
    "id": "UQ3KV7PEU",
    "team_id": "TPENYK07J",
    "name": "teja",
    "deleted": false,
    "color": "e0a729",
    "real_name": "Teja",
    "tz": "Asia/Kolkata",
    "tz_label": "India Standard Time",
    "tz_offset": 19800,
    "profile": {
      "title": "",
      "phone": "",
      "skype": "",
      "real_name": "Teja",
      "real_name_normalized": "Teja",
      "display_name": "Teja",
      "display_name_normalized": "Teja",
      "status_text": "",
      "status_emoji": "",
      "status_expiration": 0,
      "avatar_hash": "g3e4958abd06",
      "email": "teja@theloops.ai",
      "image_24": "https://secure.gravatar.com/avatar/3e4958abd06c3a7fef0f1ce0377e3b96.jpg?s=24&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0009-24.png",
      "image_32": "https://secure.gravatar.com/avatar/3e4958abd06c3a7fef0f1ce0377e3b96.jpg?s=32&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0009-32.png",
      "image_48": "https://secure.gravatar.com/avatar/3e4958abd06c3a7fef0f1ce0377e3b96.jpg?s=48&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0009-48.png",
      "image_72": "https://secure.gravatar.com/avatar/3e4958abd06c3a7fef0f1ce0377e3b96.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0009-72.png",
      "image_192": "https://secure.gravatar.com/avatar/3e4958abd06c3a7fef0f1ce0377e3b96.jpg?s=192&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0009-192.png",
      "image_512": "https://secure.gravatar.com/avatar/3e4958abd06c3a7fef0f1ce0377e3b96.jpg?s=512&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0009-512.png",
      "status_text_canonical": "",
      "team": "TPENYK07J"
    },
    "is_admin": false,
    "is_owner": false,
    "is_primary_owner": false,
    "is_restricted": false,
    "is_ultra_restricted": false,
    "is_bot": false,
    "is_app_user": false,
    "updated": 1572801379,
    "locale": "en-US"
  }
]


*/