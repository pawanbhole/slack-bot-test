var path = require("path");
const Dotenv = require('dotenv-webpack');

module.exports = function() {
	return {
		name: 'slackbot',
		target: 'node',
		mode: 'development',
		entry: "./src/app",
		output: {
			path: path.join(__dirname, "dist"),
			filename:  "app.js"
		},
		externals: {
			'firebase-admin' : "commonjs firebase-admin", 
			'i18next' : "commonjs i18next", 
			'i18next-sync-fs-backend' : "commonjs i18next-sync-fs-backend", 
			'winston' : "commonjs winston", 
			'request-promise' : "commonjs request-promise", 
			'google-auth-library' : "commonjs google-auth-library", 
			'express' : "commonjs express",
			'botkit' : "commonjs botkit", 
			'request-promise': "commonjs request-promise",
			'handlebars': 'commonjs handlebars'
		},
		plugins: [
			new Dotenv()
		]
	};
};