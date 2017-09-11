'use strict';

var express = require('express');

module.exports = function(dependencies) {

    var controller = require('./controller')(dependencies);
    var authorizationMW = dependencies('authorizationMW');

    var router = express.Router();

    router.get('/api/myfiles',
        authorizationMW.requiresAPILogin,
        controller.findCreatorFile);

    router.get('/api/listbpmn',
        authorizationMW.requiresAPILogin,
        controller.listBpmn);

    router.get('/api/find/:id',
        controller.findFile);

    router.post('/api/savebpmn',
        authorizationMW.requiresAPILogin,
        controller.saveBpmn);

    router.delete('/api/removebpmn/:id',
        authorizationMW.requiresAPILogin,
        controller.removeBpmn);

    return router;
};
