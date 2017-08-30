const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const statsDataFile = require('./stats.json');

function getStats(name){
  var index = 0;
  statsDataFile.users.map((x, idx) =>{
    if (x.username.toLowerCase() === name.toLowerCase()){
      index = idx;
      return
    }
  });
  return index
}

var getspecificstats = function (name, callback){
  fs.readFile('stats.json', 'utf8', function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
      obj = JSON.parse(data);
      obj.users.map((x, idx) =>{
        if (x.username.toLowerCase() === name.toLowerCase()){
          callback(JSON.stringify(obj.users[idx]));
          return
        }
      });
    }
  });
}

function changestats(name, win, loss, word, wordlength, time, gamestatus){
    fs.readFile('stats.json', 'utf8', function readFileCallback(err, data){
      if (err){
          console.log(err);
      } else {
        obj = JSON.parse(data);
        var userdata = obj.users[getStats(name)];
        userdata.games = Number(userdata.games)+ 1;
        userdata.wins = Number(userdata.wins)+Number(win);
        userdata.losses = Number(userdata.losses)+Number(loss);
        userdata.words.push(word.join(""));
        userdata.wordlengths.push(wordlength);
        userdata.avgwordlength = (userdata.wordlengths.reduce((a,b) => a+b, 0))/userdata.wordlengths.length;
        userdata.times.push(time);
        userdata.avgtime = (userdata.times.reduce((a,b) => a+b, 0))/userdata.times.length;
        userdata.gamestatus.push(gamestatus);
        json = JSON.stringify(obj);
        fs.writeFile('stats.json', json, 'utf8');
    }});
}

function addstatuser(name){
  fs.readFile('stats.json', 'utf8', function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
      obj = JSON.parse(data);
      obj.users.push({username:name,games:"0",wins:"0",losses:"0",words:[],wordlengths:[],avgwordlength:"0",times:[],avgtime:"0",gamestatus:[]});
      json = JSON.stringify(obj);
      fs.writeFile('stats.json', json, 'utf8');
    }
  });
}

var pullStats = function (callback){
  fs.readFile('stats.json', 'utf8', function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
      obj = JSON.parse(data);
      // callback(obj.users);
      callback(JSON.stringify(obj.users));
    }
  });
}

module.exports = {
  getspecificstats:getspecificstats,
  changestats: changestats,
  addstatuser: addstatuser,
  pullStats:pullStats
}
