const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const { mongoose } = require('./db/mongoose')

app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const { List, Task } = require('./db/models')

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
  List.findByIdAndUpdate({_id: req.params.id}, {
    $set: req.body,
  }).then(() => {
    res.sendStatus(200);
    console.log("Document updated successfully!")
  })
})

app.delete('/lists/:id', (req, res) => {
  // Delete a list
  List.findByIdAndDelete({ _id: req.params.id})
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
  },{
    $set: req.body
  })
  .then(() => {
    res.sendStatus(200)
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


app.listen(3000, () => {
  console.log('listening on port: 3000');
})