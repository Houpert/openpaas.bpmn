'use strict';

angular.module('esn.bpmn')
  .controller('formController', function($scope, bpmnService) {

    $scope.activitiName = "MyActivitiForm";
    var bpmnFormData = bpmnService.listActiveTask().then(function(result) {
      $scope.activitiFields = result.data[0].form;
      return result.data[0].form;
    }, function(err) {
      alert(err);
    });

    $scope.activiti = {
    };

    $scope.onSubmit = function(id){
      console.log($scope.activiti)
      bpmnService.completeTask($scope.activiti).then(function(result) {
        console.log(result);
        alert('Task Complete');
        return result;
      }, function(err) {
        alert('Error during the task execution')
      });
    };
});
