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
			utils.log("aiota-master", config.serverName, null, err);
		}
		else {
			init(function(err) {
				if (err) {
					utils.log("aiota-master", config.serverName, db, "Error initialising AiotA!");
					utils.log("aiota-master", config.serverName, db, err);
					return;
				}
				
				var proc = {
					launchingProcess: "aiota-master",
					serverName: config.serverName,
					directory: "/usr/local/lib/node_modules/aiota/node_modules",
					module: "aiota-controller",
					script: "controller.js",
					description: "AiotA Micro Process Controller",
					logFile: "/var/log/aiota/aiota.log"
				};
				
				utils.startProcess(db, proc);
			});
		}
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
