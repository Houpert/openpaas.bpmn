'use strict';

angular.module('esn.bpmn')
  .controller('formTask', function($scope, bpmnService) {

    $scope.activitiName = 'Task list';
    $scope.activitiFields ={};

    $scope.bpmnDataList = bpmnService.listActiveTaskList().then(function(result) {
      if(result.data.length === 0){
        $scope.hasTask = false;
      }else {
        $scope.hasTask = true;
      }
      $scope.bpmnDataList = result.data;
      return result.data;
    }, function(err) {
      alert(err);
    });

    /*The form model*/
    $scope.activiti = {
    };
});
