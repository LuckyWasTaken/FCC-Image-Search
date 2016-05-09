var express = require("express");
var http = require("http");
var app = express();
var search = require('node-bing-api')({ accKey: process.env.API });
var mongo = require('mongodb').MongoClient;
var mongourl = 'mongodb://localhost:27017/history';

app.get("/",function(request, response) {
    response.end("Use /search/<query> to search images or /latest to browse latest queries");
});

app.get("/latest",function(request, response) {
    mongo.connect(mongourl,function(err,db){
        if(err) throw err;
        var coll = db.collection('latest');
        coll.find({}).sort({"date":-1}).limit(50).toArray(function(err, docs) {
            if (err) throw err;
            var latest = docs.map(function (item) {
                return {query:item.query, date:item.date};
            });
            response.end(JSON.stringify(latest));
            db.close();
        });
    });
});

app.get("/search/:q", function(request, response) {
    search.images(request.params.q, {skip: request.query.offset||0}, function(error, res, body){
        var results=body.d.results.map(function(item){
            var obj = {
                "title" : item.Title,
                "thumbnail" : item.Thumbnail.MediaUrl,
                "url" : item.MediaUrl,
                "context" : item.SourceUrl
            };
            return(obj);
        });
    mongo.connect(mongourl,function(err,db){
        if(err) throw err;
        var coll = db.collection('latest');
        coll.insert({
            "query":request.params.q,
            "date":new Date().toLocaleString()
        },function(err,obj){
            if(err) throw err;
            db.close();
        });
    });
    response.end(JSON.stringify(results));
});
});

http.createServer(app).listen(process.env.PORT);