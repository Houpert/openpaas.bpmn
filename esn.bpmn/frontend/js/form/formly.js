'use strict';

angular.module('esn.bpmn')
  .controller('formController', function($scope, bpmnService) {

    $scope.isShow = false;
    $scope.hasTask = false;

    $scope.activitiName = "My task form";
    $scope.activitiFields ={};

    $scope.bpmnFormDataList = bpmnService.listActiveTask().then(function(result) {
      if(result.data.length == 0){
        $scope.hasTask = false;
      }else {
        $scope.hasTask = true;
      }
      $scope.bpmnFormDataList = result.data;
      return result.data;
    }, function(err) {
      alert(err);
    });

    /*The form model*/
    $scope.activiti = {
    };


    $scope.selectForm = function(data){
      $scope.activitiFields = data.form;
      $scope.isShow = true;
    }

    $scope.onSubmit = function(id){
      bpmnService.completeTask($scope.activiti).then(function(result) {
        alert('Task Complete');
        return result;
      }, function(err) {
        alert('Error during the task execution : '+err.data.message)
      });
    };
});
