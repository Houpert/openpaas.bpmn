angular.module('esn.bpmn')
  .factory('camunda', function() {
    return require('camunda-bpmn-moddle/resources/camunda');
  });
