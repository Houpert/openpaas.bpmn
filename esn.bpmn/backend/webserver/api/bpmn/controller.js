'use strict';

var logger, core, filestore;



function findCreatorFile(req, res) {
  if(!req.user._id){
    return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'The user isn\'t connected'}});
  }
  /*if(!req.params.creator){
    return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'The "creator" is required'}});
  }*/
  var query = {
    objectType: 'user',
    id: req.user._id
    //creator: req.params.creator
  };

  var result = filestore.find(query, function(err, meta) {
    if (meta) {
      return res.status(200).json(meta);
    }
    if (err) {
      return res.json(503, {
        error: 503,
        message: 'Server error',
        details: err.message || err
      });
    }
  });
  query.result = result;
  return res.status(200).json(query);
}

module.exports = function(dependencies) {
  logger = dependencies('logger');
  filestore = dependencies('filestore');
  core = require('./core')(dependencies);

  return {
    findCreatorFile: findCreatorFile
  };
};
