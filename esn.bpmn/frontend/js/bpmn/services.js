'use strict';

angular.module('esn.bpmn')
  .factory('bpmnService', function($http) {
    //TODO manage return server
    var listFile = function() {
      return $http.get('/bpmnJs/api/file/bpmn').then(function(response) {
        return response;
      });
    };

    var selectFile = function() {
      //TODO manage file return xml format
      return $http.get('/bpmnJs/api/file/bpmn/test').then(function(response) {
        return response;
      });
    };

    var writeFile = function() {
      //TODO Manage data to store

      var bpmnJson = {
          "id": "8456f852-9a65-4ab6-8ccb-5e0275b03d71",
          "contentType": "contentType",
          "metadata": "metadata",
          "stream": "stream",
          "option": "option"
        }

      return $http.post('/bpmnJs/api/file/bpmn', bpmnJson).then(function(response) {
        return response;
      });
    };

    return {
      listFile : listFile,
      writeFile : writeFile,
      selectFile : selectFile
    };
  });
