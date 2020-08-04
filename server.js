const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const { mongoose } = require('./db/mongoose')

app.use(bodyParser.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH, PUT, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

let verifySession = (req, res, next) =>{
  let refreshToken = req.header('x-refresh-token');
  let _id = req.header('_id');

  User.findByIdAndToken(_id, refreshToken).then((user) => {
    if(!user) {
      return Promise.reject({
        "error": "User not found. Check refresh token and id are valid"
      })
    }

    req.user_id = user._id;
    req.userObject = user;
    req.refreshToken = refreshToken;

    let isSessionValid = false;

    user.sessions.forEach((session) => {
      if(session.token === refreshToken) {
        if(User.hasRefreshTokenExpired(session.expiresAt) === false){
          isSessionValid = true;
        }
      }
    })

    if(isSessionValid) {
      next();
    }else{
      return Promise.reject({
        "error": "The refresh token is expired or the session is invalid"
      })
    }

  }).catch((e) => {
    res.status(401).send(e);
  })
}

const { List, Task, User } = require('./db/models')

app.get('/lists', (req, res) => {
  // Get all posts
  List.find({})
    .then((lists) => {
      res.send(lists);
    })
})

app.post('/lists', (req, res) => {
  // Create a list

  let title = req.body.title;
  let newList = new List({
    title
  })

  newList.save().then((listDoc) => {
    console.log(`${listDoc} has been successfully created`)
    res.send(listDoc)
  })
});

app.patch('/lists/:id', (req, res) => {
  // Update a task item
  List.findByIdAndUpdate({ _id: req.params.id }, {
    $set: req.body,
  }).then(() => {
    res.send({ message: "Updated Successfully" });
    console.log("Document updated successfully!")
  })
})

app.delete('/lists/:id', (req, res) => {
  // Delete a list
  List.findByIdAndDelete({ _id: req.params.id })
    .then((listDocumentRemoved) => {
      res.send(listDocumentRemoved)
      console.log(listDocumentRemoved._id, " successfully deleted");
    })
})

app.get('/lists/:listId/tasks', (req, res) => {
  console.log(req.params, "_listID")
  console.log(req.params, "_id")
  Task.find({
    _listId: req.params.listId
  })
    .then((tasks) => {
      // console.log(`${tasks} here`)
      res.send(tasks);
    });
})

app.post('/lists/:listId/tasks', (req, res) => {
  let newTask = new Task({
    title: req.body.title,
    _listId: req.params.listId
  })

  newTask.save()
    .then((newTaskDoc) => {
      res.send(newTaskDoc);
    })
})

app.patch('/lists/:listId/tasks/:taskId', (req, res) => {
  Task.findByIdAndUpdate({
    _id: req.params.taskId,
    _listId: req.params.listId
  }, {
    $set: req.body
  })
    .then(() => {
      res.send({ message: "Task updated successfully" })
    })
})

app.delete('/lists/:listId/tasks/:taskId', (req, res) => {
  Task.findByIdAndRemove({
    _id: req.params.taskId,
    _listId: req.params.listId
  })
    .then(() => {
      res.send('Task has been deleted')
    })
})


/* USER ROUTES */
app.post('/users', (req, res) => {
  let body = req.body;
  let newUser = new User(body);

  newUser.save().then(() => {
    return newUser.createSession()
  }).then((refreshToken) => {
    return newUser.generateAccessAuthToken().then((accessToken) => {
      return { accessToken, refreshToken }
    });
  }).then((authTokens) => {
    console.log(authTokens, "THIS IS authTokens")
    res
      .header('x-refresh-token', authTokens.refreshToken)
      .header('x-access-token', authTokens.accessToken)
      .send(newUser);
  }).catch((e) => {
    // console.log(e)
    res.status(400).send(e);
  })
})

app.post('/users/login', (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  User.findByCredentials(email, password).then((user) => {
    return user.createSession().then((refreshToken) => {
      return user.generateAccessAuthToken().then((accessToken) => {
        return { accessToken, refreshToken }
      })
    }).then((authTokens) => {
      res
        .header('x-refresh-token', authTokens.refreshToken)
        .header('x-access-token', authTokens.accessToken)
        .send(user)
    })
  }).catch((e) => {
    res.status(400).send(e);
  })
})

app.get('/users/me/access-token', verifySession, (req, res) => {
  req.userObject.generateAccessAuthToken().then((accessToken) => {
    res.header('x-access-token', accessToken).send({ accessToken })
  }).catch((e) => {
    res.status(400).send(e);
  })
}); 

app.listen(3000, () => {
  console.log('listening on port: 3000');
})