'use strict';

var logger, core, filestore, bpmnCore;

function findCreatorFile(req, res) {
    if (!req.user._id) {
        return res.status(400).json({
            error: {
                code: 400,
                message: 'Bad Request',
                details: 'The user isn\'t connected'
            }
        });
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
            return res.status(500).json({
                error: {
                    code: 500,
                    message: 'Error while searching file',
                    details: err ? err.message : res
                }
            });
        }
        if (!meta) {
            return res.status(500).json({
                error: {
                    code: 500,
                    message: 'Error while searching file, no files found'
                }
            });
        }
        if (meta) {
            return res.status(200).json(meta);
        }
    });
}

function findFile(req, res) {
    var query = {
        bpmnFileId: req.params.id
    };
    return bpmnCore.findBpmnById(query, function(err, result) {
        console.log(result);
        return res.status(200).json(result);
    });
}

function listBpmn(req, res) {
    var email = req.user.accounts[0].emails[0];
    var domaineMail = email.substring(email.lastIndexOf("@") +1);
    return bpmnCore.list(function(err, result) {
        var filterResult = [];
        for (var i in result) {
          if(result[i].company === domaineMail){
              filterResult.push(result[i]);
          }
        }
        return res.status(200).json(filterResult);
    });
}

function saveBpmn(req, res) {
    var email = req.user.accounts[0].emails[0];
    var domaineMail = email.substring(email.lastIndexOf("@") +1);
    var bpmnData = {
        bpmnFileId: req.body.bpmnFileId,
        name: req.body.fileName,
        company: domaineMail
    };

    return bpmnCore.save(bpmnData, function(err) {
      var query = {
            name: bpmnData.name,
            bpmnFileId: bpmnData.bpmnFileId,
            company: bpmnData.company
        };
        if (err) {
            return res.status(400).json(query);
        } else {
            return res.status(200).json(query);
        }
    });
}

function removeBpmn(req, res) {
    var query = {
        bpmnFileId: req.params.id
    };

    return bpmnCore.remove(query, function(err, result) {
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
        findFile: findFile,
        listBpmn: listBpmn,
        saveBpmn: saveBpmn,
        removeBpmn: removeBpmn
    };
};
