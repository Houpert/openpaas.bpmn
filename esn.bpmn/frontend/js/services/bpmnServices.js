'use strict';

angular.module('esn.bpmn')
  .factory('bpmnService', function($http, fileUploadService, notificationFactory) {
    //TODO manage config return file list server
    var webServiceActivitiURL = 'http://10.31.0.114:8090/';

    //ACTIVITI WEBSERVICE
    var activitiWebService = function(file) {
      var uploadUrl = webServiceActivitiURL + 'action/parse/execute';

      var fd = new FormData();
      fd.append('file', file);
      return $http.post(uploadUrl, fd, {
        transformRequest: angular.identity,
        headers: {'Content-Type': undefined}
      }).success(function(res) {
        notificationFactory.weakInfo('Execution', 'Process started : ' + res.idNumber);
        return res;
      }).error(function(err) {
        notificationFactory.weakError('Error', 'Error during the  execution : ' + err.message);
        return err;
      });
    };

    var listActiveTaskForm = function(userInfo) {
      var listActiveBpmnUrl = webServiceActivitiURL + 'action/task/list';

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

    return {
      activitiWebService:activitiWebService,
      listActiveTaskForm:listActiveTaskForm,
      listActiveTaskList:listActiveTaskList,
      completeTask:completeTask
    };
  });
