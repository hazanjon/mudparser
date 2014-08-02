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

var twithandler = {};

twithandler.incoming = function(data){
	if(!data || !data.hasOwnProperty('in_reply_to_user_id') || data.in_reply_to_user_id != config.bot_user_id){
		//Catch any responses on the streaming API that arent actually aimed at the bot and discard them
		console.log('Invalid Twitter Data', data);
		return;
	}
}
