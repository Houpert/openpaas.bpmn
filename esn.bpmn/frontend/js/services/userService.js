'use strict';

angular.module('esn.bpmn')
  .factory('userService', function($http, fileUploadService) {

    var listFile = function() {
      return $http.get('/bpmnJs/api/myfiles').then(function(response) {
        return response;
      });
    };

    var selectFile = function(id) {
      return $http.get('/api/files/' + id).then(function(response) {
        return response;
      });
    };

    var deleteFile = function(id) {
      return $http.delete('/api/files/' + id).then(function(response) {
        return response;
      });
    };

    var writeFile = function(file) {
      fileUploadService.get().addFile(file, true);
    };

    var userInfo = function() {
      return $http.get('/api/user/').then(function(response) {
        return response.data;
      });
    };

    return {
      deleteFile:deleteFile,
      listFile:listFile,
      writeFile:writeFile,
      selectFile:selectFile,
      userInfo:userInfo
    };
  });
