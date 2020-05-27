const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')

const jwtSecret = "_8Txggu7A3v1csMRlwRPtsy7Izpff2RDDWCWTBR6aTE";

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    minlength: 1,
    unique: true,
    trim: true,
    required: true
  },
  password: {
    type: String,
    minlength: 8,
    required: true
  },
  sessions: [{
    token: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Number,
      required: true
    }
  }]
});


// This custom toJSON method helps us define what JSON object we want to return because the default toJSON method returns all objects including the ones we need to be private (token, password)
UserSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();

  return _.omit(userObject, ['password', 'sessions'])
}

UserSchema.methods.generateAccessAuthToken = function() {
  const user = this;
  return new Promise((resolve, reject) => {
    jwt.sign({ _id: user._id.toHexString()}, jwtSecret, { expiresIn: "15m"}, (err, token) => {
      if(!err){
        resolve(token);
      }else{
        reject();
      }
    })
  })
}

UserSchema.methods.generateRefreshAuthToken = function() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buffer) => {
      if(!err) {
         let token = buffer.toString('hex');

         return resolve(token)
      }else{
        reject()
      }
    })
  })
}

UserSchema.methods.createSession = function() {
  let user = this;

  return user.generateAccessAuthToken().then((refreshToken) => {
    return saveSessionToDatabase(user, refreshToken)
  }).then((refreshToken) => {
    return refreshToken;
  }).catch((e) => {
    return Promise.reject('Failed failed to save the session to the database.\n >>>>>>> \n' + e)
  })
}

let saveSessionToDatabase = (user, refreshToken) => {
  return new Promise((resolve, reject) => {
    let expiresAt = generateRefreshTokenExpiryTime();

    user.sessions.push({ 'token': refreshToken, expiresAt})

    user.save().then(() => {
      return resolve(refreshToken);
    }).catch((e) => {
      reject(e)
    })
  })
}

let generateRefreshTokenExpiryTime = () => {
  let daysUntilExpire = "10";
  let secondsUntilExpire = ((daysUntilExpire * 24) * 60) * 60;
  return ((Date.now() / 1000 ) + secondsUntilExpire )
}