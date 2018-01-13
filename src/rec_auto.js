const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'zb-database';

function createCollated(db, callback) {
  db.createCollection('contacts',
    {
      'collation' :
        { 'locale': 'fr_CA' }
    },

    function(err, results) {
      console.log("Collection created.");
      callback();
    }
  );
};
function createCapped(db, name) {
	  db.createCollection(name, { "capped": true, "size": 1000000, "max": 5000},
		      function(err, results) { console.log("Collection created."); }
		    );
};

function check_collections(db, collection) {
    // Capped collection.
    var capped ;
    var m = collection;
    capped = db.collection(m);

    capped.find().count(function(err, count) {

        if(err) throw err;

        if (count === 0) {          
            console.log("Creating collection..." + m);
	createCapped(db, m);
        }
    });
}

const WebSocket = require('ws');

function WebSocketClient(){
	this.number = 0;	// Message number
	this.autoReconnectInterval = 5*1000;	// ms
}
WebSocketClient.prototype.open = function(url){
	this.url = url;
	this.instance = new WebSocket(this.url);
	this.instance.on('open',()=>{
		this.onopen();
	});
	this.instance.on('message',(data,flags)=>{
		this.number ++;
		this.onmessage(data,flags,this.number);
	});
	this.instance.on('close',(e)=>{
		switch (e){
		case 1000:	// CLOSE_NORMAL
			console.log("WebSocket: closed");
			break;
		default:	// Abnormal closure
			this.reconnect(e);
			break;
		}
		this.onclose(e);
	});
	this.instance.on('error',(e)=>{
		switch (e.code){
		case 'ECONNREFUSED':
			this.reconnect(e);
			break;
		default:
			this.onerror(e);
			break;
		}
	});
}
WebSocketClient.prototype.send = function(data,option){
	try{
		this.instance.send(data,option);
	}catch (e){
		this.instance.emit('error',e);
	}
}
WebSocketClient.prototype.reconnect = function(e){
	console.log(`WebSocketClient: retry in ${this.autoReconnectInterval}ms`,e);
        this.instance.removeAllListeners();
	var that = this;
	setTimeout(function(){
		console.log("WebSocketClient: reconnecting...");
		that.open(that.url);
	},this.autoReconnectInterval);
}
WebSocketClient.prototype.onopen = function(e){	console.log("WebSocketClient: open",arguments);	}
WebSocketClient.prototype.onmessage = function(data,flags,number){	console.log("WebSocketClient: message",arguments);	}
WebSocketClient.prototype.onerror = function(e){	console.log("WebSocketClient: error",arguments);	}
WebSocketClient.prototype.onclose = function(e){	console.log("WebSocketClient: closed",arguments);	}
//auto clinet 

var uri = 'wss://api.zb.com:9999/websocket';

MongoClient.connect(url, function(err, client) {
  assert.equal(null, err);
  console.log("Connected correctly to server");
  const db = client.db(dbName);
  const zb_markets = require('./zb_markets').zb_markets;
  for (i in zb_markets)check_collections(db, zb_markets[i]);

	function sleep (time) {
		  return new Promise((resolve) => setTimeout(() => resolve(time), time));
	}
   for (var idx in zb_markets){
	sleep(idx * 500).then((time) => {
		var idx = time / 500;
		var channel = zb_markets[idx].replace('_','') +'_ticker';
		var req = JSON.stringify( { 'event':'addChannel', 'channel': channel })
		var wsc = new WebSocketClient();
		wsc.open(uri);
		wsc.onopen = function(e){
			console.log(zb_markets[idx], idx);
			console.log("WebSocketClient connected zb " + channel,e);
			this.send(req);
		}
		wsc.onmessage = function(data,flags,number){
			//console.log(`WebSocketClient message #${number}: `,data);
			var ticker  = {};
			var datajs =  JSON.parse(data);
			for (k in datajs['ticker']) ticker[k] = parseFloat(datajs['ticker'][k]);
			ticker['date'] = parseInt(datajs['date']) * 0.001;
			ticker['market'] = zb_markets[idx];
			db.collection(zb_markets[idx]).insertOne(ticker, function(err, r) { });
	 }
   });
   }

});
