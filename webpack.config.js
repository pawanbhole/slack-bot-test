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
			'botkit' : "commonjs botkit", 
			'request-promise': "commonjs request-promise"
		},
		plugins: [
			new Dotenv()
		]
	};
};