const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const statsDataFile = require('./stats.json');


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



var pullStatsAPI = function (callback){
  fs.readFile('stats.json', 'utf8', function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
      obj = JSON.parse(data);
      callback(obj.users);
      // callback(JSON.stringify(obj.users));
    }
  });
}

module.exports = {
  changestats: changestats,
  pullStatsAPI:pullStatsAPI
}
