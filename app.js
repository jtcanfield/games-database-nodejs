const express = require('express');
const path = require('path');
const mustache = require('mustache-express');
const bodyParser = require('body-parser');
const app = express();
const userFile = require('./users.js');
const statsFile = require('./stats.js');
const session = require('express-session');
const fs = require('fs');
const wordFile = fs.readFileSync("/usr/share/dict/words", "utf-8").toLowerCase().split("\n");
app.use(session({ secret: 'this-is-a-secret-token', cookie: { maxAge: 60000, httpOnly: false}}));
app.engine('mustache', mustache());
app.set('view engine', 'mustache');
app.set('views', './views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
var gameWin = false;
var gameLoss = false;
var timeTaken = 0;
function isLetter(c) {
  return c.toLowerCase() != c.toUpperCase();
};
function timerBeginCount(){
  x = setInterval(function() {
    timeTaken += 1000;
    var mins = Math.floor((timeTaken % (1000 * 60 * 60)) / (1000 * 60));
    var secs = Math.floor((timeTaken % (1000 * 60)) / 1000);
    finalTime = mins + "m " + secs + "s ";
  }, 1000);
};


//BEGIN GETS
app.get("/", function (req, res) {
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
app.get("/mysteryword", function (req, res) {
  if (req.sessionStore.authedUser === undefined){res.redirect('/login');return}
  res.redirect('/');
});


app.get("/statistics", function (req, res) {
  statsFile.pullStats(function(x){
    // res.json({stats: x});
    res.render("statistics", {stats:x, username:req.sessionStore.authedUser});
  });
});
//END GETS

//BEGIN POSTS
app.post("/", function (req, res) {
  res.redirect('/');
});
app.post("/mysteryword", function (req, res) {
  res.redirect('/');
});

app.post("/login", function (req, res) {
  userFile.checkLogin(req.body.username, req.body.password, function(x){
    if (x){
      req.sessionStore.authedUser = req.body.username;
      res.redirect("/");
    } else {
      res.render("login", {status:"Incorrect User Id or Password"});
    }
  });
});


app.post("/startgame:dynamic", function (req, res) {
  if (req.sessionStore.authedUser === undefined){res.redirect('/login');return}
  var arrayOfPossibleWords = [];
  switch (req.params.dynamic) {
    case "easy":
      wordFile.map((x) =>{
        if (x.length >= 4 && x.length <= 6){
          arrayOfPossibleWords.push(x);
        }
      });
      break;
    case "medium":
      wordFile.map((x) =>{
        if (x.length >= 6 && x.length <= 8){
          arrayOfPossibleWords.push(x);
        }
      });
      break;
    case "hard":
      wordFile.map((x) =>{
        if (x.length > 8){
          arrayOfPossibleWords.push(x);
        }
      });
      break;
    default:
  }
  var wordindex = Math.floor(Math.random() * arrayOfPossibleWords.length);
  //SPREAD OPERATOR:
  req.sessionStore.word = [...arrayOfPossibleWords[wordindex]];
  var emptyArray = [];
  req.sessionStore.word.map((x) =>{emptyArray.push("_")});
  req.sessionStore.emptyWord = emptyArray;
  req.sessionStore.guessed = [];
  req.sessionStore.lives = 8;
  timerBeginCount();
  // var encodedstring = encodeURIComponent('{game:"active",emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:"0", letterstatus:"Go!"}');
  // console.log(decodeURIComponent(encodedstring));
  // res.redirect("/mysteryword" + encodedstring);
  res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:"0", letterstatus:"Go!"});
});

app.post("/submitletter", function (req, res) {
  if (req.sessionStore.authedUser === undefined){res.redirect('/login');return}
  if (req.sessionStore.emptyWord === undefined){res.render("index", {username : req.sessionStore.authedUser});return}
  if (req.sessionStore.emptyWord !== undefined){
    var lettersubmitted = req.body.lettersubmitted.toLowerCase();
    if (isLetter(lettersubmitted) === false){//Input is not a letter
      res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:timeTaken, letterstatus:"That is not a letter..."});
      return
    }
    if (req.sessionStore.guessed.indexOf(lettersubmitted) !== -1){
      res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:timeTaken, letterstatus:"You Already Guessed That Letter!"});
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
        statsFile.changestats(req.sessionStore.authedUser, 0, 1, req.sessionStore.word, req.sessionStore.word.length, timeTaken, "Loss");
        res.render("mysteryword", {gamefinal:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: "Out of lives!", time:timeTaken, letterstatus:"Wrong!"});
        clearInterval(x);
        req.sessionStore.emptyWord = undefined;
        return
      } else {
        res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:timeTaken, letterstatus:"Wrong!"});
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
        statsFile.changestats(req.sessionStore.authedUser, 1, 0, req.sessionStore.word, req.sessionStore.word.length, timeTaken, "Win");
        res.render("mysteryword", {gamefinal:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:timeTaken, letterstatus:"Good Game!"});
        clearInterval(x);
        req.sessionStore.emptyWord = undefined;
        return
      } else {
        res.render("mysteryword", {game:true,username:req.sessionStore.authedUser,emptyWord:req.sessionStore.emptyWord, guessed:req.sessionStore.guessed, lives: req.sessionStore.lives, time:timeTaken, letterstatus:"Nice!"});
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
  res.redirect('/login');
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
  statsFile.getspecificstats(req.params.dynamic, function(x){
    res.render("profile", {stats:x, username:req.sessionStore.authedUser});
  });
});
app.get("/:dynamic", function (req, res) {
  console.log("DYNAMIC TRIGGERED:")
  console.log(req.params.dynamic);
  res.redirect('/');
});

app.listen(3000, function () {
  console.log('Hosted on local:3000');
})
