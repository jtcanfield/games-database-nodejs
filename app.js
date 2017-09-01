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
app.use(function (req, res, next) {
  MongoClient.connect(mongoURL, function (err, db) {
    const users = db.collection("users");
    users.find({sessionID:{$eq: req.sessionID}}).toArray(function (err, docs) {
      console.log("THIS IS THE CHECK:")
      console.log(docs[0])
    })
  })
  next();
})
app.get("/login", function (req, res) {
  req.sessionStore.authedUser = undefined;
  res.render("login", {messages: res.locals.getMessages()});
});
passport.use(new LocalStrategy(
    function(username, password, done) {
      userFile.checkLogin(username, password, function(err, userobj, msg){
        console.log("STRATEGY LAUNCHED");
        console.log(userobj)
        if (err){
            return done(err)
        } else {
            return done(null, userobj, {message: msg})
        }
      });
    }
));
passport.serializeUser(function(user, done) {
  console.log("SERIALIZEUSER RAN:");
  console.log(user);
    done(null, user);
});

passport.deserializeUser(function(userobj, done) {
  userFile.getUserCallback(userobj.username, function(err, user){
      console.log("DEEEESERIALIZEUSER RAN:");
      console.log(user);
      done(err, user);
    });
});
const requiresLogin = function (req, res, next) {
  console.log("REQ,USER BELOW:")
  console.log(req.user);
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
}













//BEGIN GETS
app.get("/", function (req, res) {
  console.log("REQ.USER FOR THE GET SLASH")
  console.log(req.user);
  if (req.sessionStore.authedUser === undefined){res.redirect('/login');return}
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
    res.render("statistics", {stats:JSON.stringify(docs), username:req.sessionStore.authedUser});
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
    console.log(user)
    if (err) {  return res.redirect('/') }
    if (!user) { return res.redirect('/login');  }
    req.sessionStore.authedUser = user.username
    MongoClient.connect(mongoURL, function (err, db) {
      const users = db.collection("users");
      users.updateOne({username:{$eq: user.username}}, {$set: {sessionID:req.sessionID}}, function (err, docs) {
      return res.redirect('/');
      })
    })
  })(req, res, next);
});



app.post("/", function (req, res) {
  res.redirect('/');
});
app.post("/mysteryword", function (req, res) {
  res.redirect('/');
});


app.post("/startgame:dynamic", function (req, res) {
  if (req.sessionStore.authedUser === undefined){res.redirect('/login');return}
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
    res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:"0", letterstatus:"Go!"});
  });
});

app.post("/submitletter", function (req, res) {
  if (req.sessionStore.authedUser === undefined){res.redirect('/login');return}
  if (req.sessionStore.emptyWord === undefined){res.render("index", {username : req.sessionStore.authedUser});return}
  if (req.sessionStore.emptyWord !== undefined){
    var lettersubmitted = req.body.lettersubmitted.toLowerCase();
    if (isLetter(lettersubmitted) === false){//Input is not a letter
      res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"That is not a letter..."});
      return
    }
    if (req.sessionStore.guessed.indexOf(lettersubmitted) !== -1){
      res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"You Already Guessed That Letter!"});
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
        statsFile.changestats(req.sessionStore.authedUser, 0, 1, req.sessionStore.word, req.sessionStore.word.length, req.body.timer, "Loss");
        res.render("mysteryword", {gamefinal:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: "Out of lives!", time:req.body.timer, letterstatus:"Wrong!"});
        req.sessionStore.emptyWord = undefined;
        return
      } else {
        res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"Wrong!"});
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
        statsFile.changestats(req.sessionStore.authedUser, 1, 0, req.sessionStore.word, req.sessionStore.word.length, req.body.timer, "Win");
        res.render("mysteryword", {gamefinal:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"Good Game!"});
        req.sessionStore.emptyWord = undefined;
        return
      } else {
        res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:req.body.timer, letterstatus:"Nice!"});
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
      userFile.addUser(req.body.username, req.body.password2, req.body.email, function(){
        statsFile.addstatuser(req.body.username);
        req.sessionStore.authedUser = req.body.username;
        res.redirect('/');
        return
      })
    }
  });
});
app.post("/logout", function (req, res) {
  req.sessionStore.authedUser = undefined;
  req.session.destroy();
  res.redirect('back');
});
app.post("/loginredirect", function (req, res) {
  req.sessionStore.authedUser = undefined;
  res.redirect('/login');
});
app.post("/signupredirect", function (req, res) {
  req.sessionStore.authedUser = undefined;
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
