/*
 * aiota.js: Top level include for the AiotA platform
 *
 * (C) 2015 Arthur Viegers, Kurt Pattyn & the Contributors
 * MIT LICENCE
 *
 */

var utils = require("aiota-utils");
var ip = require("ip");
var mkdirp = require("mkdirp");
var portscanner = require("portscanner");
var MongoClient = require("mongodb").MongoClient;

var aiota_dir = __dirname.slice(0, -3);

var conf = require(aiota_dir + "/config");
var config = null;
var package = require(aiota_dir + "/package");

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
	utils.getConfig(db, function(c) {
		if (c == null) {
			db.collection("config", function(err, collection) {
				if (err) {
					utils.log(__filename, "", db, err);
					callback();
					return;
				}
		
				config = {
					_id: 0,
					serverName : ip.address(),
					ports : {
						mongodb : 27017,
						"aiota-console" : 26080,
						"aiota-controller" : 26081,
						"aiota-ingestion" : [
							26010,
							26029
						],
						"aiota-stream" : [
							26030,
							26049
						]
					},
					database : {
						host : "localhost",
						name : "qaweb"
					},
					amqp : {
						host : "localhost",
						port : 5672,
						login : "guest",
						password : "guest",
						connectionTimeout : 0,
						authMechanism : "AMQPLAIN",
						vhost : "/",
						ssl : {
							enabled : false
						}
					},
					directories : {
						aiota : aiota_dir,
						log : "/var/log/aiota/"
					}
				};
				
				collection.insert(config, function(err, result) {
					if (err) {
						utils.log(__filename, config.serverName, db, err);
					}
					
					mkdirp(config.directories.log, function(err) {
						if (err) {
							callback(err);
						}
						
						callback(null);
					});
				});
			});
		}
		else {
			config = c;
		
			mkdirp(config.directories.log, function(err) {
				if (err) {
					callback(err);
				}
				
				callback(null);
			});
		}
	});
}

function removeProcesses(db, callback)
{
	db.collection("running_processes", function(err, collection) {
		if (err) {
			utils.log(__filename, config.serverName, db, err);
			callback();
			return;
		}

		collection.remove({}, function(err, result) {
			if (err) {
				utils.log(__filename, config.serverName, db, err);
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
					utils.log(__filename, conf.serverName, db, "Error initialising AiotA!");
					utils.log(__filename, conf.serverName, db, err);
					console.log("Unable to start AiotA due to initialisation error. See AiotA log for details.");
					return;
				}
				
				// Check is the controller port is free
				portscanner.checkPortStatus(config.ports["aiota-controller"], config.serverName, function(err, status) {
					if (err) {
						utils.log(__filename, config.serverName, db, err);
						console.log("Unable to start AiotA due to port scanning error. See AiotA log for details.");
					}
					
					if (status == "closed") {
						// Remove all processes from the running processes collection which have not sent their status for 20 seconds or more
						removeProcesses(db, function() {
							var proc = {
								launchingProcess: "aiota-master",
								serverName: config.serverName,
								directory: config.directories.aiota + "node_modules",
								module: "aiota-controller",
								script: "controller.js",
								args: [ conf.database.host, conf.database.port, conf.database.name ],
								maxRuns: 3,
								description: "AiotA Micro Process Controller",
								logFile: config.directories.log + "aiota.log"
							};
							
							utils.startProcess(db, proc);
						});
					}
					else {
						var msg = "Unable to launch AiotA: the aiota-controller port (" + config.ports["aiota-controller"] + ") is already in use!";
						utils.log(__filename, config.serverName, db, msg);
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
