'use strict';

angular.module('esn.bpmn')
  .controller('bpmnExecutor', function($scope, $window, $http, bpmnLoader, bpmnService, userService, $modal, notificationFactory) {

    $scope.selectedTab = 'executor';

    function getFileName(fileData) {
      userService.getFileName(fileData).then(function(res) {
        $scope.listBpmnFile.push(res);
      });
    }

    function listFile() {
      return userService.listFile().then(function(result) {
        $scope.listBpmnFile = [];
        for (var i in result.data) {
          getFileName(result.data[i]);
        }
        return $scope.listBpmnFile;
      }, function(err) {
        notificationFactory.weakError('Error', err);
      });
    }

    $scope.listBpmnFile = listFile();

    $scope.executeProcess = function(name, id) {
      userService.selectFile(id).then(function(result) {
        console.log(name);
        console.log(id);
        console.log(result.data);
        var blob = new Blob([result.data], {type: 'text/xml'});
        var fileOfBlob = new File([blob], name);
        bpmnService.activitiExecuteBpmn(fileOfBlob);
      }, function(err) {
        notificationFactory.weakError('Error', err);
      });
    };
  }
);
