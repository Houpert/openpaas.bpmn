'use strict';

var logger, core, filestore, bpmnCore;

function findCreatorFile(req, res) {
  if (!req.user._id) {
    return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'The user isn\'t connected'}});
  }

  var query = {
    metadata: {
      creator: {
        objectType: 'user',
        id: req.user._id
      }
    }
  };

  filestore.find(query, function(err, meta) {
    if (err) {
      return res.status(500).json({error: {code: 500, message: 'Error while searching file', details: err ? err.message : res}});
    }
    if (!meta) {
      return res.status(500).json({error: {code: 500, message: 'Error while searching file, no files found'}});
    }
    if (meta) {
      return res.status(200).json(meta);
    }
  });
}

function listBpmn(req, res){
  return bpmnCore.list(function (err, result) {
    return res.status(200).json(result);
  });
}

function saveBpmn(req, res){
  var bpmnData = {
    bpmnFileId : req.body.bpmnFileId,
    name : req.body.fileName
  };

  return bpmnCore.save(bpmnData, function(err) {
    var query = {
      name: bpmnData.name,
      bpmnFileId: bpmnData.bpmnFileId
    };
    if (err) {
      return res.status(400).json(query);
    } else {
      return res.status(200).json(query);
    }
  });
}

function removeBpmn(req, res){
  var query = { bpmnFileId : req.params.id};

  return bpmnCore.remove(query ,function (err, result) {
    return res.status(200).json(result);
  });
}

module.exports = function(dependencies) {
  logger = dependencies('logger');
  filestore = dependencies('filestore');
  core = require('./core')(dependencies);
  bpmnCore = require('./../../../lib/db/bpmnCore')(dependencies);

  return {
    findCreatorFile: findCreatorFile,
    listBpmn: listBpmn,
    saveBpmn: saveBpmn,
    removeBpmn: removeBpmn
  };
};
