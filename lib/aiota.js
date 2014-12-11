/*
 * aiota.js: Top level include for the AIoTA platform
 *
 * (C) 2014 Arthur Viegers, Kurt Pattyn & the Contributors
 * MIT LICENCE
 *
 */

var forever = require("forever-monitor");
var utils = require("aiota-utils");
var mkdirp = require("mkdirp");
var MongoClient = require("mongodb").MongoClient;
var config = require("/usr/local/lib/node_modules/aiota/config");
var package = require("/usr/local/lib/node_modules/aiota/package");

var aiota = exports;

var db = null;

MongoClient.connect("mongodb://" + config.database.host + ":" + config.database.port + "/aiota", function(err, dbConnection) {
	if (err) {
		utils.log(config.processName, config.serverName, null, err);
	}
	else {
		db = dbConnection;
	}
});

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

function startProcess(dir, script, uid, descr)
{
	var child = new (forever.Monitor)(dir + script, {
		max: 3,
		silent: true,
		uid: uid,
		killTree: true,
		minUptime: 2000,
		spinSleepTime: 1000,
		args: [],
		outFile: "/var/log/aiota/aiota.log"
	});

	child.on("start", function () {
		utils.log(config.processName, config.serverName, db, descr + " process (uid: " + uid + ") has been started.");
	});

	child.on("exit", function () {
		utils.log(config.processName, config.serverName, db, descr + " process (uid: " + uid + ") has exited after 3 restarts");
	});
	
	child.start();
}

function start(args)
{
	init(function(err) {
		if (err) {
			utils.log(config.processName, config.serverName, db, "Error initialising AiotA!");
			utils.log(config.processName, config.serverName, db, err);
			return;
		}
		
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-console/console.js", "console", "AiotA Management Console");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-ingestion/ingestion.js", "ingestion", "Ingestion API");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-register/register.js", "register", "Device Registration Worker");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-session/session.js", "session", "Session Provisioning Worker");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-longpolling/longpolling.js", "longpolling", "Long Polling Worker");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-response/response.js", "response", "Response Message Worker");
		startProcess("/usr/local/lib/node_modules/aiota/node_modules", "/aiota-telemetry/telemetry.js", "telemetry", "Telemetry Message Worker");
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
