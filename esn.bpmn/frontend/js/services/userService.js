'use strict';

angular.module('esn.bpmn')
  .factory('userService', function($http, fileUploadService) {
    //TODO manage return file list server
    var openPaasAPI = 'http://localhost:8080/api/';

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

    var userInfo = function(){
      //TODO user OpenPaas object here ?
      var userApiPath = openPaasAPI+'user';
      return $http.get(userApiPath).then(function(response) {
        console.log(response.data);
        return response.data;
      });
    }

    return {
      deleteFile:deleteFile,
      listFile:listFile,
      writeFile:writeFile,
      selectFile:selectFile,
      userInfo:userInfo
    };
  });
