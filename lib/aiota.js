/*
 * aiota.js: Top level include for the AIoTA platform
 *
 * (C) 2014 Arthur Viegers, Kurt Pattyn & the Contributors
 * MIT LICENCE
 *
 */
var aiota_dir = "/usr/local/lib/node_modules/aiota/";
var log_dir = "/var/log/aiota/";

var utils = require("aiota-utils");
var mkdirp = require("mkdirp");
var portscanner = require("portscanner");
var MongoClient = require("mongodb").MongoClient;
var conf = require(aiota_dir + "config");
var config = null;
var package = require(aiota_dir + "package");

var processName = "aiota.js";

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

function init(db, callback)
{
	mkdirp(log_dir, function(err) {
		if (err) {
			callback(err);
		}
		
		aiota.getConfig(db, function(c) {
			if (c == null) {
				callback({ error: "Error getting config from database" });
			}
			else {
				config = c;
				callback(null);
			}
		});
	});
}

function removeProcesses(db, callback)
{
	db.collection("running_processes", function(err, collection) {
		if (err) {
			utils.log(processName, config.serverName, db, err);
			callback();
			return;
		}

		collection.remove({}, function(err, result) {
			if (err) {
				utils.log(processName, config.serverName, db, err);
			}
			
			callback();
		});
	});
}

function setConfig(db, callback)
{
	db.collection("config", function(err, collection) {
		if (err) {
			utils.log(processName, config.serverName, db, err);
			callback();
			return;
		}

		collection.update({ _id: 0 }, { $set: config }, { upsert: true }, function(err, result) {
			if (err) {
				utils.log(processName, config.serverName, db, err);
			}
			
			callback();
		});
	});
}

function start(args)
{
	MongoClient.connect("mongodb://" + conf.database.host + ":" + conf.database.port + "/" + conf.database.name, function(err, db) {
		if (err) {
			utils.log("aiota-master", conf.serverName, null, err);
		}
		else {
			init(db, function(err) {
				if (err) {
					utils.log(processName, conf.serverName, db, "Error initialising AiotA!");
					utils.log(processName, conf.serverName, db, err);
					return;
				}
				
				// Check is the controller port is free
				portscanner.checkPortStatus(config.ports["aiota-controller"], config.serverName, function(err, status) {
					if (err) {
						utils.log(processName, config.serverName, db, err);
						console.log("Unable to start AiotA due to port scanning error. See AiotA log for details.");
					}
					
					if (status == "closed") {
						// Remove all processes from the running processes collection which have not sent their status for 20 seconds or more
						removeProcesses(db, function() {
							setConfig(db, function() {
								var proc = {
									launchingProcess: "aiota-master",
									serverName: config.serverName,
									directory: aiota_dir + "node_modules",
									module: "aiota-controller",
									script: "controller.js",
									maxRuns: 3,
									description: "AiotA Micro Process Controller",
									logFile: log_dir + "aiota.log"
								};
								
								utils.startProcess(db, proc);
							});
						});
					}
					else {
						var msg = "Unable to launch AiotA: the aiota-controller port (" + config.ports["aiota-controller"] + ") is already in use!";
						utils.log(processName, config.serverName, db, msg);
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
