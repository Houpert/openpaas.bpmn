'use strict';

var logger, core, filestore;

function listFile(req, res) {
  var myMessage = 'my list file';
  //TODO List all file server here

  return res.json(200, {message: myMessage});
}

module.exports = function(dependencies) {
  logger = dependencies('logger');

  //TODO For use filestore check (rse/backend/core/filestore) or github document https://github.com/linagora/openpaas-esn/blob/master/doc/REST_API/REST_files.md
  filestore = dependencies('filestore');

  core = require('./core')(dependencies);
  return {
    listFile: listFile,
  };
};
