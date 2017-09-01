const fs = require('fs'),
    path = require('path'),
    express = require('express'),
    mustache = require('mustache-express'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    passport = require('passport'),
    flash = require('express-flash-messages'),//FLASH MESSAGES ALLOWS YOU TO USE res.locals.getMessages(), AND STORE THEM IN messages
    LocalStrategy = require('passport-local').Strategy,
    expressValidator = require('express-validator');


const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const mongoURL = 'mongodb://localhost:27017/gamesdatabasenodejs';
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost:27017/gamesdatabasenodejs');


const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const app = express();
const userFile = require('./users.js');
const statsFile = require('./stats.js');
const mysterywordgameFile = require('./mysterywordgame.js');
const UserModel = require("./models/model");


app.use(session({ secret: 'this-is-a-secret-token', cookie: { maxAge: 60000, httpOnly: false}}));
app.engine('mustache', mustache());
app.set('view engine', 'mustache');
app.set('views', './views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
var gameWin = false;
function isLetter(c) {
  return c.toLowerCase() != c.toUpperCase();
};







app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(userobj, done) {
  userFile.getUserCallback(userobj.username, function(err, user){
      done(err, user);
    });
});
app.use(function (req, res, next) {
  console.log("unnamed function");
  res.locals.user = req.user;//REQ.USER IS LIKE A GLOBAL MUSTACHE VARIABLE
  console.log(res.locals);
  next();
})
app.get("/login", function (req, res) {
  res.render("login", {messages: res.locals.getMessages()});
});
passport.use(new LocalStrategy(
    function(username, password, done) {
      MongoClient.connect(mongoURL, function (err, db) {
        const users = db.collection("users");
        users.find({username:{$eq: username.toLowerCase()}, password:{$eq: password}, }).toArray(function (err, docs) {
          if (docs[0] !== undefined){
            return done(null, docs[0])
          }
          if (docs[0] === undefined){
            return done("INVALID", false)
          }
        })
      })
    }
));
const requiresLogin = function (req, res, next) {
  if (req.user) {
    next()
  } else {
    res.redirect('/login/');
  }
}













//BEGIN GETS
app.get("/", requiresLogin, function (req, res) {
  console.log(req.user.username)
  res.render("index", {username : req.sessionStore.authedUser});
});

app.get("/login", function (req, res) {
  req.sessionStore.authedUser = undefined;
  res.render("login");
});

app.get("/signup", function (req, res) {
  req.sessionStore.authedUser = undefined;
  res.render("signup");
});
app.get("/mysteryword", requiresLogin, function (req, res) {
  if (req.sessionStore.authedUser === undefined){res.redirect('/login');return}
  res.redirect('/');
});


app.get("/statistics", function (req, res) {
  MongoClient.connect(mongoURL, function (err, db) {
    const statlist = db.collection("statistics");
    statlist.find().toArray(function (err, docs) {
    res.render("statistics", {stats:JSON.stringify(docs)});
    })
  })
});
//END GETS

//BEGIN POSTS
// app.post('/login', passport.authenticate('local', {
//     successRedirect: '/',
//     failureRedirect: '/login',
//     failureFlash: true
// }))
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {  return res.render("login", {status:err}) }
    if (!user) { return res.redirect('/login');  }
    MongoClient.connect(mongoURL, function (err, db) {
      const users = db.collection("users");
      users.updateOne({username:{$eq: user.username}}, {$set: {sessionID:req.sessionID}}, function (err, docs) {
      req.logIn(user, function() {});//NEEDS TO BE USED IN ORDER TO USE REQ.USER
      return res.redirect('/');
      })
    })
  })(req, res, next);
});



app.post("/", function (req, res) {
  res.redirect('/');
});


app.post("/startgame:dynamic", requiresLogin, function (req, res) {
  mysterywordgameFile.getword(req.params.dynamic, function(word){
    req.sessionStore.word = [...word];
    var emptyArray = [];
    req.sessionStore.word.map((x) =>{emptyArray.push("_")});
    req.sessionStore.emptyWord = emptyArray;
    req.sessionStore.guessed = [];
    req.sessionStore.lives = 8;
    // var encodedstring = encodeURIComponent('{game:"active",emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:"0", letterstatus:"Go!"}');
    // console.log(decodeURIComponent(encodedstring));
    // res.redirect("/mysteryword" + encodedstring);
    res.render("mysteryword", {game:true,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:"0", letterstatus:"Go!"});
  });
});

app.post("/submitletter", requiresLogin, function (req, res) {
  if (req.sessionStore.emptyWord === undefined){res.render("index", {username : req.user.username});return}
  if (req.sessionStore.emptyWord !== undefined){
    var lettersubmitted = req.body.lettersubmitted.toLowerCase();
    if (isLetter(lettersubmitted) === false){//Input is not a letter
      res.render("mysteryword", {game:true,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"That is not a letter..."});
      return
    }
    if (req.sessionStore.guessed.indexOf(lettersubmitted) !== -1){
      res.render("mysteryword", {game:true,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"You Already Guessed That Letter!"});
      return
    }
    req.sessionStore.guessed.push(lettersubmitted);
    if (req.sessionStore.word.indexOf(lettersubmitted) === -1){//Input is not correct
      req.sessionStore.lives -= 1;
      if (req.sessionStore.lives === 0){//Game Loss
        req.sessionStore.emptyWord.map((x, index) =>{//Maps thru word to try and makes letters correct
          if (x === "_"){
            req.sessionStore.emptyWord[index] = "wrong"+req.sessionStore.word[index];
          }
        });
        statsFile.changestats(req.user.username, 0, 1, req.sessionStore.word, req.sessionStore.word.length, req.body.timer, "Loss");
        res.render("mysteryword", {gamefinal:true,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: "Out of lives!", time:req.body.timer, letterstatus:"Wrong!"});
        req.sessionStore.emptyWord = undefined;
        return
      } else {
        res.render("mysteryword", {game:true,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"Wrong!"});
      }
      return
    }
    if (req.sessionStore.word.indexOf(lettersubmitted) !== -1){//Input is correct
      req.sessionStore.word.map((x, index) =>{//Maps thru word to try and makes letters correct
        if (x === lettersubmitted){
          req.sessionStore.emptyWord[index] = lettersubmitted;
        }
      });
      gameWin = true;
      req.sessionStore.emptyWord.map((x) =>{
        if (x === "_"){
          gameWin = false;
        }
      });
      if (gameWin === true){//GAME WIN
        statsFile.changestats(req.user.username, 1, 0, req.sessionStore.word, req.sessionStore.word.length, req.body.timer, "Win");
        res.render("mysteryword", {gamefinal:true,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"Good Game!"});
        req.sessionStore.emptyWord = undefined;
        return
      } else {
        res.render("mysteryword", {game:true,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"Nice!"});
      }
    } else {
      console.log("GAME BROKE!");
      console.log(req.sessionStore);
    }
  }
});

app.post("/signup", function (req, res) {
  userFile.checkExistingUsers(req, function(error, errordescrip){
    if (error === true){
      res.render('signup', {status:errordescrip});
      return
    } else if (error !== true){
      MongoClient.connect(mongoURL, function (err, db) {
        const users = db.collection("users");
        users.find({username:{$eq: req.body.username.toLowerCase()}}).toArray(function (err, docs) {
          if (docs[0] !== undefined){
            res.render('signup', {status:"Username already exists, choose another user name"});
            return
          }
          if (docs[0] === undefined){
            MongoClient.connect(mongoURL, function (err, db) {
              const users = db.collection("users");
              const statlist = db.collection("statistics");
              users.insertOne({username: req.body.username, password: req.body.password2, email: req.body.email, sessionID: ""}, function (err, docs) {})
              statlist.insertOne({username:req.body.username,games:"0",wins:"0",losses:"0",words:[],wordlengths:[],avgwordlength:"0",times:[],avgtime:"0",gamestatus:[]}, function (err, docs) {})
              return res.redirect('/');
            })
          }
        })
      })
    }
  });
});
app.post("/logout", function (req, res) {
  req.session.destroy();
  res.redirect('back');
});
app.post("/loginredirect", function (req, res) {
  res.redirect('/login');
});
app.post("/signupredirect", function (req, res) {
  res.redirect('/signup');
});
app.post("/statisticsredirect", function (req, res) {
  res.redirect('/statistics');
});
app.get("/profile:dynamic", function (req, res) {
  MongoClient.connect(mongoURL, function (err, db) {
    const statlist = db.collection("statistics");
    statlist.find({ username: { $eq: req.params.dynamic } }).toArray(function (err, docs) {
    res.render("statistics", {stats:JSON.stringify(docs), username:req.sessionStore.authedUser});
    })
  })
});
app.get("/search:dynamic", function (req, res) {
  statsFile.pullStatsAPI(function(x){
    res.json({stats: x});
  });
});
app.get("/:dynamic", function (req, res) {
  console.log("DYNAMIC TRIGGERED:")
  console.log(req.params.dynamic);
  res.redirect('/');
});
process.env.PORT || 5000
app.listen(process.env.PORT || 5000, function () {
  console.log('Hosted on local:5000 or Dynamic');
})
MongoClient.connect(mongoURL, function(err, db) {
  console.log("Connected successfully to server at " + mongoURL);
  db.close();
});

// const con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: ""
// });
// con.connect(function(err) {
//   if (err){
//       console.log(err);
//       return
//   }
//   console.log("Connected!");
// });
