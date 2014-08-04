var config = require('./config.json');

var util = require('util'),
    twitter = require('twitter');
    
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser')
var request = require('request');

// twitter.prototype.updateStatusWithMedia = function(text, imageUrl, callback) {	
// 	var form, r;
	
// 	var url = this.options.rest_base + '/statuses/update_with_media.json';
// 	console.log(url);
// 	r = request.post(url, {
// 		oauth: config.twitter
// 	}, callback);
// 	form = r.form();
// 	form.append('status', text);
// 	return form.append('media[]', request(imageUrl));
// }

var helpers = {};

helpers.getByProp = function(myArray, prop, value) {
    return myArray.filter(function(obj) {
    	if(obj.hasOwnProperty(prop)){
			if(obj[prop] === value) {
				return obj 
			}
		}
    })[0]
}

var twitterhandler = {
	user_reply_num: [],
	api: new twitter(config.twitter)
};

//twitterhandler.api.updateStatusWithMedia('@hazanjon test', 'http://placekitty.artisan.io/200/300', function(err, res){console.log(err, res);});

twitterhandler.incoming = function(tweet){
	//Catch any responses on the streaming API that arent actually aimed at the bot and discard them
	if(!tweet){
		console.log('Invalid Twitter Data - No Data Passed');
		return;
	}
	
	if(!tweet.user || tweet.user.id == config.bot.user_id){
		console.log('Error 59');
		return; //Dont process outgoing messages
	}
	
	if(tweet.text){
		var text = tweet.text.toLowerCase();
		text = text.replace(/@[0-9a-z]+/g, "")
		text = text.trim();
		
		mudparser.parse(text, twitterhandler.userid(tweet.user.screen_name), function(response){
			
			twitterhandler.reply(tweet, response);
			
		});
	}else{
		console.log('Invalid Twitter Data - No Text', tweet);
	}
}

twitterhandler.reply = function(data, response){
	
	if(response == '' && data.text.indexOf('@'+config.bot.screen_name) === 0){
		var response = "I'm sorry I don't understand what you are trying to do";
	}
	
	//Only response if there a message from the API or the message was addressed directly at the bot
	if(response != ''){
		
		var replytext = '@' + data.user.screen_name + '';
		replytext += twitterhandler.replyUniqueNumber(data.user.id) + ' ';
		
		replytext += response;
		
		//@TODO: Handle length errors here

		this.api
	    .verifyCredentials(function(data) {
	        //console.log(util.inspect(data));
	    })
	    .updateStatus(replytext,
	        function(data) {
	            console.log('Reply Sent: ', replytext);//util.inspect(data));
	        }
	    );
	}
}

twitterhandler.userid = function(id){
	return 'twitter-' + id;
}

twitterhandler.replyUniqueNumber = function(user_id){
	
	//@TODO: Dont do bad things here
	if(!twitterhandler.user_reply_num.hasOwnProperty(user_id)){
		twitterhandler.user_reply_num[user_id] = 0;
	}
	
	var name = config.bot.dup_protection_bots[twitterhandler.user_reply_num[user_id]];
	
	twitterhandler.user_reply_num[user_id]++;
	if(twitterhandler.user_reply_num[user_id] >= config.bot.dup_protection_bots.length)
		twitterhandler.user_reply_num[user_id] = 0;
	
	return ' @'+name;
}

twiliohandler = {};

twiliohandler.incoming = function(req, res){
	
	var message = req.body.Body;
	var from = req.body.From;
	console.log('From: ' + from + ', Message: ' + message);
		
	if(message){
		var message = message.toLowerCase();
		
		mudparser.parse(message, twiliohandler.userid(from), function(response){
			
			twiliohandler.reply(res, response);
			
		});
	}else{
		console.log('Blank message');
	}
}

twiliohandler.reply = function(res, response){
	// Return sender a very nice message
	// twiML to be executed when SMS is received
	var twiml = '<Response><Sms>' + response + '</Sms></Response>';
	res.send(twiml, {'Content-Type':'text/xml'}, 200);
}

twiliohandler.userid = function(id){
	return 'twilio-' + id;
}

var mudparser = {};

mudparser.validCommands = [
	{
		action: 'north',
		alternatives: ['n'],
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'south',
		alternatives: ['s'],
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'east',
		alternatives: ['e'],
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'west',
		alternatives: ['w'],
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'move',
		alternatives: ['m'],
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'fight',
		alternatives: ['f'],
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'open',
		alternatives: ['o'],
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'start',
		alternatives: ['s', 'join', 'j', 'create', 'c'],
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'help',
		alternatives: ['h'],
		hasValue: false,
		target: ''
	}
];

mudparser.commandSubstitute = function(command){
	this.validCommands.forEach(function(com){
		com.alternatives.forEach(function(alt){
			if(command == alt)
				command = com.action;
		});
	});
	
	return command;
}

mudparser.parse = function(text, userid, callback){
	if(typeof callback != "function"){
		callback = function(data){
			console.log('No callback passed to parser', text, data);
		}
		return;
	}
	
	var parts = text.split(' ');
	
	parts[0] = this.commandSubstitute(parts[0]);
	
	var command = helpers.getByProp(this.validCommands, 'action', parts[0]);
	var value = '';
	
	if(!command){
		console.log('No command detected', text, parts);
		callback('');
		return;
	}
	
	/*if(command.hasValue){
		if(!parts[1]){
			console.log('Command requires value', text, parts);
			return;
		}
		
		value = parts[1];
	}*/
	
	value = command.action;
	if(command.action == 'move')
		value = this.commandSubstitute(parts[1]);
	
	if(command.action == 'help'){
		callback('Commands: Start (s), North (n), South (s), East (e), West (w), Fight (f), Open (o), Help (h)');
		return;
	}
	
	mudparser.api(command, userid, value, function(data){
		callback(data);
	});
}

mudparser.api = function(command, userid, value, callback){
	if(typeof callback != "function"){
		callback = function(data){
			console.log('No callback passed to apicall', command, userid, value);
		}
		return;
	}
	
	var url = config.game_server.url;
	
	url += command.target.replace('#player#', userid);
	
	//@TODO: Currently no support for this in API
	//url += '?action=' + command.action + '&value=' + value;
	
	url += '?action=' + value;
	
	console.log('API Call', url);
	var request = http.get(url, function(response){
		var resp = '';
	    response.on('data', function (chunk) {
	    	resp += chunk;
	    });
	    
	    response.on('end', function(){
			console.log('Resp:', resp);
			resp = JSON.parse(resp);
			var message = resp.string;
			callback(message);
	    });
	    
	    response.on('error', function(error){
			console.log('HTTP Error', error);
	    });
	}).on('error', function(error) {
		console.log('HTTP Error2', error);
	});
	//callback("Your in a room. " + value);
}

// Setup App

twitterhandler.api.stream('filter', {follow: config.bot.user_id}, function(stream) {
    stream.on('data', function(data) {
    	console.log('tweet arrived');
        twitterhandler.incoming(data);
    });
    // Disconnect stream after five seconds
//    setTimeout(stream.destroy, 5000);
});


var app = express();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send('Hello World');
});

// Create a route to respond to a call
app.post('/respondToSMS', twiliohandler.incoming);

app.listen(config.port || 3000);
