
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const time_range = 10;
const url = 'mongodb://localhost:27017';
const dbName = 'zb-database';
zb_markets = require('./zb_markets').zb_markets;

var db;
MongoClient.connect(url, function(err, client) {
  assert.equal(null, err);
  console.log("Connected correctly to server");
  db = client.db(dbName);
  query_rate_for_m(db, zb_markets[2], 60);
});

function query_rate_for_m(db, m, time) {
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
					        console.log(cur);
						var upper = cur.date + time_range - time;
						var lower = cur.date - time_range - time;
						//console.log({date: {"$lt": upper , "$gt": lower}})
						//console.log(m);
						collection.find({date: {"$lt": upper, "$gt": lower }}).limit(1)
					        .toArray(function(err, items) {
								if (! pre) {
									resolve({});
								}
							          if (err) {
									              //reject(err);
									  	      resolve({});
									            } else {
									              console.log("res: ",items);
										      var pre = items[0];
									              resolve(
										      	{ market: m,
											  rate: (pre.last - cur.last) / cur.last,
											  price: cur.last
											}
										      );
									            }          
							        });
					      });
			}
		  );
}
