const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const time_range = 10;
const url = 'mongodb://localhost:27017';
const dbName = 'zb-database';
const zb_markets = require('./zb_markets').zb_markets;
apis = {'1min':60,
	'3min': 3 * 60,
	'5min': 5 * 60,
	'10min': 10 * 60,
}

app.get('/api/:apiParam', function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	if (! apis[req.params['apiParam']]) res.send('invalid');
        var time  = apis[req.params['apiParam']];
	//console.log(time, zb_markets)
	var actions = zb_markets.map(m => query_rate_for_m(db, m, time));
	var results = Promise.all(actions);
	results.then(data => 
		{
		      //console.log("data",data);
	              res.send(JSON.stringify({
			      "data":data.filter(value => Object.keys(value).length !== 0)
		      }))}
	  );
	});

app.get('/', (req, res) => {
	  res.sendFile(__dirname + '/index.html');
});
app.get('/static/:file', (req, res) => {
	  res.sendFile(__dirname + '/static/' + req.params['file']);
});
app.get('/:file(*.(ttf|woff|woff2))', (req, res) => {
	  res.sendFile(__dirname + '/static/' + req.params['file']);
});


var db;
MongoClient.connect(url, function(err, client) {
  assert.equal(null, err);
  console.log("Connected correctly to server");
  db = client.db(dbName);
  app.listen(5000, function() {
  	  console.log('listening on 5000')
  })
});

function query_rate_for_m(db, m, time) {
	//console.log("query:", m, time);
	  return new Promise(function(resolve, reject) {
			  var collection = db.collection(m);
			  collection.find().sort({date:-1}).limit(1).toArray(function(err, items) {
					    if (err) {
							//	reject(err);
							      resolve({});
							      } else {
								//console.log(items);
								resolve(items);
							      }          
					  })
	  })
		  .then(
		  	function(docs) {
				return new Promise(function(resolve, reject) {
						var collection = db.collection(m);
					        var cur = docs[0];
					        if (! cur) {
							resolve({});
						}
					        //console.log(cur);
						var upper = cur.date + time_range - time;
						var lower = cur.date - time_range - time;
						//console.log({date: {"$lt": upper , "$gt": lower}})
						//console.log(m);
						collection.find({date: {"$lt": upper, "$gt": lower }}).limit(1)
					        .toArray(function(err, items) {
							          if (err) {
									              //reject(err);
									  	      resolve({});
									            } else {
										      var pre = items[0];
								                      if (! pre) { resolve({}); } else {
									              //console.log(items[0]);
									              //console.log( { market: m, rate: (pre.last - cur.last) / cur.last, price: cur.last });
									              resolve(
										      	{ market: m,
											  rate: (pre.last - cur.last) / cur.last,
											  price: cur.last
											}
										      );}
									            }          
							        });
					      });
			}
		  );
}
