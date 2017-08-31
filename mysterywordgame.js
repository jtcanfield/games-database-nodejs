const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const statsDataFile = require('./words.json');

var getword = function (difficulty, callback){
  fs.readFile('words.json', 'utf8', function (err, data){
    if (err){
        console.log(err);
    } else {
      obj = JSON.parse(data);
      var arrayOfPossibleWords = [];
      switch (difficulty) {
        case "easy":
          obj.words.map((x) =>{
            if (x.length >= 4 && x.length <= 6){
              console.log(x)
              arrayOfPossibleWords.push(x);
            }
          });
          break;
        case "medium":
          obj.words.map((x) =>{
            if (x.length >= 6 && x.length <= 8){
              arrayOfPossibleWords.push(x);
            }
          });
          break;
        case "hard":
          obj.words.map((x) =>{
            if (x.length > 8){
              arrayOfPossibleWords.push(x);
            }
          });
          break;
        default:
      }
      var wordindex = Math.floor(Math.random() * arrayOfPossibleWords.length);
      callback(arrayOfPossibleWords[wordindex]);
    }
  });
}


module.exports = {
  getword:getword
}
