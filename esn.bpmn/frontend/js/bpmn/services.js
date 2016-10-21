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
        alert('Process started');
        return res;
      }).error(function(err){
        return err;
      });
    };

    var listActiveTask = function(){
      var listActiveBpmnUrl = webServiceActivitiURL+'action/task/list';
      return $http.get(listActiveBpmnUrl).then(function(response) {
        return response;
      });
    }

    var completeTask = function(values){
      var completeActiveTask = webServiceActivitiURL+'action/task/complet';
      return $http.post(completeActiveTask, JSON.stringify(values)).then(function(response) {
        return response;
      });
    }

    return {
      deleteFile : deleteFile,
      listFile : listFile,
      writeFile : writeFile,
      selectFile : selectFile,
      activitiWebService : activitiWebService,
      listActiveTask : listActiveTask,
      completeTask : completeTask
    };
  });
