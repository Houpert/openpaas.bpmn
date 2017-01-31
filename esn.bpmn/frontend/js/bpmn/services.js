'use strict';

angular.module('esn.bpmn')
  .factory('bpmnService', function($http, fileUploadService) {
    //TODO manage return file list server
    var openPaasAPI = 'http://localhost:8080/api/';
    var webServiceActivitiURL = 'http://10.31.0.114:8090/';

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

    //ACTIVITI WEBSERVICE

    var activitiWebService = function(file) {
      var uploadUrl = webServiceActivitiURL + 'action/parse/execute';

      var fd = new FormData();
      fd.append('file', file);
      return $http.post(uploadUrl, fd, {
        transformRequest: angular.identity,
        headers: {'Content-Type': undefined}
      }).success(function(res) {
        alert('Process started : ' + res.idNumber);
        return res;
      }).error(function(err) {
        alert('Error during the  execution : ' + err.message);
        return err;
      });
    };

    var listActiveTaskForm = function(userInfo) {
      var listActiveBpmnUrl = webServiceActivitiURL + 'action/task/list/email';

      var email = userInfo.preferredEmail;
      var fd = new FormData();
      fd.append('email', email);

      return $http.post(listActiveBpmnUrl, fd, {
        transformRequest: angular.identity,
        headers: {'Content-Type': undefined}
      }).success(function(res) {
        return res;
      }).error(function(err) {
        return err;
      });

    };

    var listActiveTaskList = function() {
      var listActiveBpmnUrl = webServiceActivitiURL + 'action/data';
      return $http.get(listActiveBpmnUrl).then(function(response) {
        return response;
      });
    };

    var completeTask = function(values) {
      var completeActiveTask = webServiceActivitiURL + 'action/task/complet';
      return $http.post(completeActiveTask, JSON.stringify(values)).then(function(response) {
        return response;
      });
    };

    var userInfo = function(){
      //TODO user OpenPaas object here ?
      var userApiPath = openPaasAPI+'user';
      return $http.get(userApiPath).then(function(response) {
        return response.data;
      });
    }

    return {
      deleteFile:deleteFile,
      listFile:listFile,
      writeFile:writeFile,
      selectFile:selectFile,
      activitiWebService:activitiWebService,
      listActiveTaskForm:listActiveTaskForm,
      listActiveTaskList:listActiveTaskList,
      completeTask:completeTask,
      userInfo:userInfo
    };
  });
