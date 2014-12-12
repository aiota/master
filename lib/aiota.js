/*
 * aiota.js: Top level include for the AIoTA platform
 *
 * (C) 2014 Arthur Viegers, Kurt Pattyn & the Contributors
 * MIT LICENCE
 *
 */

var utils = require("aiota-utils");
var mkdirp = require("mkdirp");
var MongoClient = require("mongodb").MongoClient;
var config = require("/usr/local/lib/node_modules/aiota/config");
var package = require("/usr/local/lib/node_modules/aiota/package");

var aiota = exports;

var db = null;

var helpText = [
	"",
	"Another Internet of Things Architecture (AiotA)",
	"",
	"usage: aiota [command]",
	"",
	"where [command] is one of:",
	"  start               Start the AiotA platform",
	"  cleanlogs           [CAREFUL] Deletes all historical AiotA log files",
	"  -v, --version       Print AiotA's version",
	"  help                You're staring at it",
	""
];

function init(callback)
{
	var logDirectory = "/var/log/aiota";
	
	mkdirp(logDirectory, function(err) {
		if (err) {
			callback(err);
		}
		
		callback(null);
	});
}

function start(args)
{
	MongoClient.connect("mongodb://" + config.database.host + ":" + config.database.port + "/" + config.database.name, function(err, db) {
		if (err) {
			utils.log(config.processName, config.serverName, null, err);
		}
		else {
			init(function(err) {
				if (err) {
					utils.log(config.processName, config.serverName, db, "Error initialising AiotA!");
					utils.log(config.processName, config.serverName, db, err);
					return;
				}
				
				var proc = {
					directory: "/usr/local/lib/node_modules/aiota/node_modules",
					module: "aiota-controller",
					script: "controller.js",
					description: "AiotA Micro Process Controller",
					logFile: "/var/log/aiota/aiota.log"
				};
				
				aiota.startProcess(process);
			});
		}
/*
				var proc = {
					directory: "/usr/local/lib/node_modules/aiota/node_modules",
					module: "aiota-console",
					script: "console.js",
					description: "AiotA Management Console",
					logFile: "/var/log/aiota/aiota.log"
				};

		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-ingestion/ingestion.js", "ingestion.js", "Ingestion API");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-register/register.js", "register.js", "Device Registration Worker");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-session/session.js", "session.js", "Session Provisioning Worker");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-longpolling/longpolling.js", "longpolling.js", "Long Polling Worker");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-response/response.js", "response.js", "Response Message Worker");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-telemetry/telemetry.js", "telemetry.js", "Telemetry Message Worker");
*/
	});
}

function version()
{
	console.log("v" + package.version);
}

function cleanlogs(args)
{
	console.log("Clean logs");
}

function help()
{
	console.log(helpText.join("\n"));
}

aiota.cli = function() {
	var args = process.argv.slice(2);
	
	if (args.length >= 1) {
		switch(args[0]) {
		case "start":		start(args);
							break;
		case "-v":			version()
							break;
		case "--version":	version()
							break;
		case "cleanlogs":	cleanlogs(args);
							break;
		default:			help();
		}
	}
	else {
		help();
	}
};
