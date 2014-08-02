var config = require('./config.json');

var util = require('util'),
    twitter = require('twitter');
    
var http = require('http');

var twit = new twitter(config.twitter);

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

helpers.curtisConvertion = function(data){
	//@TODO: add conversion here when Curt decides what translates to what
	return data;
}

twit.stream('filter', {follow: config.bot_user_id}, function(stream) {
    stream.on('data', function(data) {
        twithandler.incoming(util.inspect(data));
    });
    // Disconnect stream after five seconds
//    setTimeout(stream.destroy, 5000);
});

var twithandler = {
	user_reply_num: 10000000000000
};

twithandler.incoming = function(data){
	if(!data || !data.hasOwnProperty('in_reply_to_user_id') || data.in_reply_to_user_id != config.bot_user_id){
		//Catch any responses on the streaming API that arent actually aimed at the bot and discard them
		console.log('Invalid Twitter Data', data);
		return;
	}
	
	var text = data.text;
	text = text.replace(/@[0-9a-zA-Z]+/g, "")
	text = text.trim();
	
	console.log(text);
	mudparser.parse(text, twithandler.userid(data.user.id), function(response){
		
		twithandler.reply(data, response);
		
	});
}

twithandler.reply = function(data, response){
	console.log(data);
/*
twit
    .verifyCredentials(function(data) {
        console.log(util.inspect(data));
    })
    .updateStatus('Test tweet from node-twitter/' + twitter.VERSION,
        function(data) {
            console.log(util.inspect(data));
        }
    );*/
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

mudparser.substitutions = [
	{
		substition: 'north',
		alternatives: ['n']
	},
	{
		substition: 'south',
		alternatives: ['s']
	},
	{
		substition: 'east',
		alternatives: ['e']
	},
	{
		substition: 'west',
		alternatives: ['w']
	}
];

mudparser.validCommands = [
	{
		action: 'move',
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'fight',
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'open',
		hasValue: true,
		target: 'player/#player#'
	},
	{
		action: 'help',
		hasValue: false,
		target: ''
	},
	{
		action: 'about',
		hasValue: false,
		target: ''
	}
];

mudparser.parse = function(text, userid, callback){
	if(typeof callback != "function"){
		callback = function(data){
			console.log('No callback passed to parser', text, data);
		}
		return;
	}
	
	var parts = text.split(' ');
	
	var command = helpers.getByProp(this.validCommands, 'action', parts[0]);
	var value = '';
	
	if(!command){
		console.log('No command detected', text, parts);
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
		value = parts[1];
	
	mudparser.substitutions.forEach(function(sub){
		sub.alternatives.forEach(function(alt){
			if(value == alt)
				value = sub.substition;
		});
	});
	
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
	
	value = helpers.curtisConvertion(value);
	url += '?action=' + value;
	
	console.log('API Call', url);
	var request = http.get(url, callback);
}

twithandler.incoming({
	in_reply_to_user_id: 2700750817, 
	text: "@mudparser move n",
	user: {
		id: 63685924
	}
});