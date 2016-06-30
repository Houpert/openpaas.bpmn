angular.module('esn.bpmn')
  .factory('bpmnPropertiesPanelProvider', function() {
    return require('bpmn-js-properties-panel/lib/provider/camunda');
  });
