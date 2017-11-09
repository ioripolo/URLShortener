var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;

app.set('view engine', 'pug');
app.set('port', (process.env.PORT || 5000));
app.set('views', __dirname +'/views');

app.get("/", function(req, res) {
  res.render('index', {
    title: 'URLShortener',
    abstract: '基本API使用：URLShortener微服务',
    stories: {
      0: '用户在浏览器输入该地址时，把一个合法的 URL 作为参数，返回一个 JSON 格式的段地址。',
      1: '如果用户输入的是一个无效的 URL 地址（不符合 http://www.example.com 格式）作为参数，则返回错误。',
      2: '如果用户输入前边生成的短地址，则会重定向到相应的合法地址。'
    },
    usage: {
      0: 'https://urlshortener-ioripolo.herokuapp.com/new/http://www.baidu.com',
      1: 'https://urlshortener-ioripolo.herokuapp.com/new/http://www.youku.com',
      2: 'https://urlshortener-ioripolo.herokuapp.com/new/http://www.google.com',
      3: 'https://urlshortener-ioripolo.herokuapp.com/1'
    },
    result: {
      0: '{"original_url":"http://www.baidu.com/","short_url":"https://urlshortener-ioripolo.herokuapp.com/1"}',
      1: '{"original_url":"http://www.baidu.com/","short_url":"https://urlshortener-ioripolo.herokuapp.com/2"}',
      2: '{"original_url":"http://www.baidu.com/","short_url":"https://urlshortener-ioripolo.herokuapp.com/3"}',
      3: 'redirect to http://www.baidu.com/'
    }
  });
});

mongo.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/shortURLs", function(err, db) {
  if (err) {
    throw new Error('Database failed to connect!');
  } else {
    console.log('Successfully connected to MongoDB');
  }
  
  app.route('/:url').get(function(req, res) {
    if (req.params.url == 'favicon.ico') return;
    var url ='https://urlshortener-ioripolo.herokuapp.com/' + req.params.url;
    db.collection('URLs').findOne({
      "short_url" : url
    }, function(err, result) {
      if (err) throw err;
      if (result) {
        console.log('Found ' + JSON.stringify(result));
        console.log('Redirecting to: ' + result.original_url);
        res.redirect(result.original_url);
      } else {
         res.send({"error": "This url is not on the database."});
      }
    });
  });
  
  app.get('/new/*', function(req, res) {
    var result = null;
    var Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w-.\/?%&=]*)?/;
    var objExpr = new RegExp(Expression);
    var url = req.params[0];
    if (objExpr.test(url) == true) {
      db.collection('URLs').find().toArray(function(err, data) {
        if (err) throw err;
        
        var newLink = null;
        // Try to find the old link for this url.
        data.map((obj) => {
          if (url == obj.original_url) {
            newLink = obj.short_url;
          }
        });
        
        if (newLink == null) {
          // Put all short links in an array
          var urlList = data.map((obj) => {
            return obj.short_url;
          });
          
          do {
            // Generates random four digit number for link
            var num = Math.floor(100000 + Math.random() * 900000);
            newLink = 'https://urlshortener-ioripolo.herokuapp.com/' + num.toString().substring(0, 4);
          } while(urlList.indexOf(newLink) != -1);
          
          var doc = {
            "original_url" : url,
            "short_url" : newLink
          };
          
          db.collection('URLs').insert(doc, function(err, result){
            if (err) throw err;
            res.send({
              "original_url" : url,
              "short_url" : newLink
            });
            console.log('Saved ' + JSON.stringify(result));
          });
        } else {
          res.send({
            "original_url" : url,
            "short_url" : newLink
          });
        }
      });
    } else {
      result = {
        error : 'invalid url'
      };
      res.end(JSON.stringify(result));
    }
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});