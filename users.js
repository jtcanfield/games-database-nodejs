const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');


var validateForm = function(request, callback){
  var valid = true;
  if (request.body.username === undefined || request.body.password1 === undefined || request.body.password2 === undefined){
    callback(true, "One field is undefined, please try again using valid characters.");
    return
  }
  if (request.body.password1.length < 4){
    callback(true, "Password must have at least 4 characters");
    return
  }
  if (request.body.password1 !== request.body.password2){
    callback(true, "Passwords do not match");
    return
  }
  if (request.body.username.length < 4){
    callback(true, "Username must have at least 4 characters");
    return
  }
  callback()
}


module.exports = {
  validateForm:validateForm
}
