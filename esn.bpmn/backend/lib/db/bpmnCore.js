'use strict';

var BpmnModel, logger;
var mongoose = require('mongoose');

function save(bpmn, callback) {
    var bpmnData = new BpmnModel(bpmn);
    bpmnData.save(function(err, res) {
        if (!err) {
            logger.info('Added new event message in database:', {
                _id: res._id.toString()
            });
        } else {
            logger.warn('Error while trying to add a new event message in database:', err.message);
        }
        callback(err, res);
    });
}

function findBpmnById(id, callback) {
    BpmnModel.findOne(id, callback);
}

function list(callback) {
    BpmnModel.find(callback);
}

function remove(id, callback) {
    BpmnModel.remove(id, callback);
}

module.exports = function(dependencies) {
    logger = dependencies('logger');
    require('./bpmnModel')(dependencies);
    mongoose.connect('mongodb://localhost:27017/esn');
    BpmnModel = mongoose.model('BpmnModel');

    return {
        findBpmnById: findBpmnById,
        save: save,
        list: list,
        remove: remove
    };
};
