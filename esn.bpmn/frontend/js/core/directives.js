'use strict';

angular.module('esn.bpmn')
.directive('applicationMenuCnet', function(applicationMenuTemplateBuilder) {
  return {
    retrict: 'E',
    replace: true,
    template: applicationMenuTemplateBuilder('/#/bpmn', 'c2net', 'C2Net')
  };
})

.directive('bpmnListSubheader', function() {
  return {
    restrict: 'E',
    templateUrl: '/bpmnJs/views/sub-header/bpmn-list-subheader.html'
  };
})
;
