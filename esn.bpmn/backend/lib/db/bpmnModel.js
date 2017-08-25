'use strict';

var mongoose = require('mongoose');

module.exports = function(dependencies) {

  var BpmnModel = new mongoose.Schema({
    bpmnFileId: {
      type: String,
      unique: true
    },
    name: {
      type: String,
      unique: false
    }
  });

  mongoose.model('BpmnModel', BpmnModel);
};
