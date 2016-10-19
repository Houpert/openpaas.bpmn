'use strict';

angular.module('esn.bpmn')
  .factory('bpmnService', function($http, fileUploadService) {
    //TODO manage return file list server
    var webServiceActivitiURL = 'http://10.31.0.112:8090/';

    var listFile = function() {
      return $http.get('/api/files').then(function(response) {
        return response;
      });
    };

    var selectFile = function(id) {
        return $http.get('/api/files/'+id).then(function(response) {
          return response;
        })
    };

    var deleteFile = function(id) {
        return $http.delete('/api/files/'+id).then(function(response) {
          return response;
        })
    };

    var writeFile = function(file) {
      fileUploadService.get().addFile(file, true);
    };

    var activitiWebService = function(file) {
      var uploadUrl = webServiceActivitiURL+'action/parse'

      var fd = new FormData();
      fd.append('file', file);
      return $http.post(uploadUrl, fd, {
          transformRequest: angular.identity,
          headers: {'Content-Type': undefined}
      }).success(function(res){
        return res;
      }).error(function(err){
        return err;
      });
    };
<!-- DEMO START HERE -->
    var activitiWebServiceDemo = function(file) {
      var uploadUrl = webServiceActivitiURL+'action/parse/test'

      var fd = new FormData();
      fd.append('file', file);
      return $http.post(uploadUrl, fd, {
          transformRequest: angular.identity,
          headers: {'Content-Type': undefined}
      }).success(function(res){
        return res;
      }).error(function(err){
        return err;
      });
    };
    <!-- DEMO END HERE -->

    return {
      deleteFile : deleteFile,
      listFile : listFile,
      writeFile : writeFile,
      selectFile : selectFile,
      activitiWebService : activitiWebService,
      activitiWebServiceDemo : activitiWebServiceDemo
    };
  });
