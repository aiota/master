/*
 * aiota.js: Top level include for the AIoTA platform
 *
 * (C) 2014 Arthur Viegers, Kurt Pattyn & the Contributors
 * MIT LICENCE
 *
 */

var utils = require("aiota-utils");
var mkdirp = require("mkdirp");
var portscanner = require("portscanner");
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
	MongoClient.connect("mongodb://" + config.database.host + ":" + config.ports.mongodb + "/" + config.database.name, function(err, db) {
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
				
				// Check is the controller port is free
				portscanner.checkPortStatus(config.ports["aiota-controller"], config.serverName, function(err, status) {
					if (err) {
						utils.log(config.processName, config.serverName, db, err);
						console.log("Unable to start AiotA due to port scanning error. See AiotA log for details.");
					}
					
					if (status == "closed") {
						// Remove all processes from the running processes collection which have not sent their status for 20 seconds or more
						db.collection("running_processes", function(err, collection) {
							if (err) {
								utils.log(config.processName, config.serverName, db, err);
								return;
							}
					
							collection.remove({}, function(err, result) {
								if (err) {
									utils.log(config.processName, config.serverName, db, err);
								}
								
								var proc = {
									launchingProcess: "aiota-master",
									serverName: config.serverName,
									directory: "/usr/local/lib/node_modules/aiota/node_modules",
									module: "aiota-controller",
									script: "controller.js",
									maxRuns: 3,
									description: "AiotA Micro Process Controller",
									logFile: "/var/log/aiota/aiota.log"
								};
								
								utils.startProcess(db, proc);
							});
						});
					}
					else {
						var msg = "Unable to launch AiotA: the aiota-controller port (" + config.ports["aiota-controller"] + ") is already in use!";
						utils.log(config.processName, config.serverName, db, msg);
						console.log(msg);
						process.exit(1);
					}
				});
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
