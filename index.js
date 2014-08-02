var config = require('./config.json');

var util = require('util'),
    twitter = require('twitter');

var twit = new twitter(config.twitter);


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
}

twithandler.reply = function(){
}

twithandler.replyUniqueNumber = function(){
	
	var num = twithandler.user_reply_num.toString(36);
	//@TODO: Check the handle isnt real
	twithandler.user_reply_num++;
	return ' @'+num;
}

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

twithandler.incoming({in_reply_to_user_id: 2700750817, text: "@mudparser hello"});