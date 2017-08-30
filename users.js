const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const userDataFile = require('./data.json');

function getUser(username){
  return userDataFile.users.find(function (user) {
    return user.username.toLowerCase() == username.toLowerCase();
  });
}

var checkLogin = function (usrname, pass, callback){
  fs.readFile('data.json', 'utf8', function(err, data){
    if (err){
        console.log(err);
    } else {
    obj = JSON.parse(data);
    var userCheck = getUser(usrname);
      if (userCheck !== undefined && pass === userCheck.password){
        callback(true);
        return
      } else {
        callback(false);
        return
      }
    }
  });
}

var checkExistingUsers = function(request, callback){
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
  userDataFile.users.map((x) =>{
    if (x.username.toLowerCase() === request.body.username.toLowerCase()){
      callback(true, "Username already exists, choose another user name");
      return valid = false
    }
    if (x.email.toLowerCase() === request.body.email.toLowerCase() && request.body.email !== ""){
      callback(true, "Email already exists. Lost your Username or Password? Email me!");
      return valid = false
    }
  });
  if (valid === false){return}else if(valid === true){callback()};
}

var addUser = function(newusername, newpassword, newemail, callback){
  fs.readFile('data.json', 'utf8', function(err, data){
    if (err){
        console.log(err);
    } else {
      obj = JSON.parse(data);
      obj.users.push({username: newusername, password: newpassword, email: newemail});
      json = JSON.stringify(obj);
      fs.writeFile('data.json', json, 'utf8');
    }
  });
  callback();
}

module.exports = {
  userObjectPull:getUser,
  checkLogin:checkLogin,
  checkExistingUsers:checkExistingUsers,
  addUser:addUser
}
