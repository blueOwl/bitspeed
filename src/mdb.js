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
	  db.createCollection(name, { "capped": true, "size": 100000, "max": 5000},
		      function(err, results) { console.log("Collection created."); }
		    );
};

function check_collections(db, collection) {
    // Capped collection.
    var markets = require("./zb_markets").zb_markets;
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

MongoClient.connect(url, function(err, client) {
  assert.equal(null, err);
  console.log("Connected correctly to server");

  const db = client.db(dbName);
  check_collections(db, m);

});

