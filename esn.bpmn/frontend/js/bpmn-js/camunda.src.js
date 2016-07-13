angular.module('esn.bpmn')
  .factory('camundaModdleDescriptor', function() {
    return require('camunda-bpmn-moddle/resources/camunda');
  });
