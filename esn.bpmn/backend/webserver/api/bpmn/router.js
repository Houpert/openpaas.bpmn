'use strict';

var express = require('express');

module.exports = function(dependencies) {

  var controller = require('./controller')(dependencies);
  var middleware = require('./middleware')(dependencies);

  var router = express.Router();

  router.get('/api/file/bpmn', middleware.passThrough, controller.listFile);

  router.get('/api/file/bpmn/:id', middleware.passThrough, controller.selectFile);

  router.post('/api/file/bpmn', middleware.passThrough, controller.writeFile);

  return router;
};
