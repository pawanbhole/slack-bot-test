import request from 'request-promise';
const users = {};
const getUserCallInProgress = {};
const reloadUserCallInProgress = {};

/*
 * Class to ahndle user operations
 */
export default class UserManager {

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
					users[userId] = response;
					resolve(response);

					//remove promise from cache as now user object is cached
					delete getUserCallInProgress[userId];
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
