const mongoose = require('mongoose');

mongoose.Promise = global.Promise
mongoose.connect('mongodb://localhost:27017/TaskManager', {
  useUnifiedTopology: true,  
  useNewUrlParser: true
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.log('There was an error logged as : >>>> ' + err);
  });

  mongoose.set('useCreateIndex', true);
  mongoose.set('useFindAndModify', true)

  module.exports = {
    mongoose
  };