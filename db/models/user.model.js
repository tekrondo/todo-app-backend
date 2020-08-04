const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')
const bcrypt = require('bcryptjs');

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
    crypto.randomBytes(64, (err, buff) => {
      if(!err) {
         let token = buff.toString('hex');
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


/* STATIC MODEL METHODS */
UserSchema.statics.findByIdAndToken = function(_id, token) {
  const User = this;

  return User.findOne({
    _id,
    'sessions.token': token
  })
}

UserSchema.statics.findByCredentials = function(email, password) {
  let User = this;
  return User.findOne({ email }).then((user) => {
    if(!user) return Promise.reject()

    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if(res) resolve(user);
        else{
          reject();
        }
      })
    })
  })
}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
  let secondsSinceEpoch = Date.now() / 1000;
  if(expiresAt > secondsSinceEpoch ) {
    return false;
  } else {
    return true;
  }
}

UserSchema.pre('save', function(next) {
  let user = this;
  let costFactor = 10;

  if(user.isModified('password')) {

    bcrypt.genSalt(costFactor, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      })
    })
  } else {
    next();
  }
  
})

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

const User = mongoose.model("User", UserSchema)
module.exports = { User }