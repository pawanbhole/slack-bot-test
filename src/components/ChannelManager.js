import request from 'request-promise';
let CHANNEL_CACHE = {};
const GET_CHANNEL_CALL_IN_PROGRESS = {};

/*
 * Class to access channel data
 */
export default class ChannelManager {


	constructor(logger) {
		this.logger = logger;
	}

	/*
	 * this function returns the promise object which resolve to channel objct.
	 *  1) First it checks if channel present in cache, if yes then returns the resolved promise with channel as resolved value
	 *. 2) If not found in cache then it checks if the call for fetching channelInfo in progress, if yes then it returns same promise
	 *  3) Last if there not even a call in progress then it calls the slack API https://api.slack.com/methods/channels.info and returns the promise
	 */
	get(channelId) {
		if(CHANNEL_CACHE[channelId] != null) {
			//channel in cache
			return Promise.resolve(CHANNEL_CACHE[channelId]);
		} else if(GET_CHANNEL_CALL_IN_PROGRESS[channelId]) {
			//channel call in progress
			return GET_CHANNEL_CALL_IN_PROGRESS[channelId];
		} else {
			//Calling API to fetch channel info
			const options = {
				url: 'https://slack.com/api/channels.info',
				qs: {
					token: process.env.apiToken,
					channel: channelId
				}
			};
			const newPromise = new Promise((resolve, reject) => {
				this._callRest(options).then((response) => {
					const output = JSON.parse(response);
					if(this.logger.isSillyEnabled()) {
						this.logger.silly('Output of channels.info api:-' + JSON.stringify(output));
					}
					if(output.ok) {
						CHANNEL_CACHE[channelId] = output.channel;
						resolve(CHANNEL_CACHE[channelId]);

						//remove promise from cache as now channel object is cached
						delete GET_CHANNEL_CALL_IN_PROGRESS[channelId];
					} else {
						reject(output.error);
					}
				}).catch((error) => {
					reject(error);
				});
			});
			//put promise in cache so there wont be a duplicate call to API when first call is in progress
			GET_CHANNEL_CALL_IN_PROGRESS[channelId] = newPromise;
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
	 * this function sends the message to the user on specified channel.
	 */
	sendMessage(channel, text) {
		//Calling API to send message 
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

	_callRest(options) {
		return request(options);
	}
}
