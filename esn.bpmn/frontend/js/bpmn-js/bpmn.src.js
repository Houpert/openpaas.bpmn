angular.module('esn.bpmn')
  .factory('bpmnJs', function() {
    return require('bpmn-js/lib/Modeler')
});
