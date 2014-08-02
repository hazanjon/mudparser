var config = require('./config.json');

var util = require('util'),
    twitter = require('twitter');
    
var http = require('http');

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

var twithandler = {
	user_reply_num: 10000000000000,
	api: new twitter(config.twitter)
};

twithandler.incoming = function(tweet){
	//Catch any responses on the streaming API that arent actually aimed at the bot and discard them
	if(!tweet){
		console.log('Invalid Twitter Data - No Data Passed');
		return;
	}
	
	if(!tweet.user || tweet.user.id == config.bot.user_id){
		console.log('Error 59:', tweet);
		return; //Dont process outgoing messages
	}
	
	if(tweet.text){
		var text = tweet.text.toLowerCase();
		text = text.replace(/@[0-9a-z]+/g, "")
		text = text.trim();
		
		mudparser.parse(text, twithandler.userid(tweet.user.id), function(response){
			
			twithandler.reply(tweet, response);
			
		});
	}else{
		console.log('Invalid Twitter Data - No Text', tweet);
	}
}

twithandler.reply = function(data, response){
	
	if(response == '' && data.text.indexOf('@'+config.bot.screen_name) === 0){
		var response = "I'm sorry I don't understand what you are trying to do";
	}
	
	//Only response if there a message from the API or the message was addressed directly at the bot
	if(response != ''){
		
		var replytext = '@' + data.user.screen_name + ' ';
		replytext += twithandler.replyUniqueNumber() + ' ';
		
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

twithandler.userid = function(id){
	return 'twitter-' + id;
}

twithandler.replyUniqueNumber = function(){
	
	var num = twithandler.user_reply_num.toString(36);
	//@TODO: Check the handle isnt real
	twithandler.user_reply_num++;
	return ' @'+num;
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
	//callback('A green and pleasant place - ' + value);
}

// Setup App



twithandler.api.stream('filter', {follow: config.bot.user_id}, function(stream) {
    stream.on('data', function(data) {
        twithandler.incoming(data);
    });
    // Disconnect stream after five seconds
//    setTimeout(stream.destroy, 5000);
});

