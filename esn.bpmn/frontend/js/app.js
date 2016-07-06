'use strict';

angular.module('esn.bpmn', [
  'op.dynamicDirective',
  'ui.router'
])

.config([
  '$stateProvider',
  'dynamicDirectiveServiceProvider',
  function($stateProvider, dynamicDirectiveServiceProvider) {
    var bpmnJs = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'application-menu-hello-world', {priority: 28});
    dynamicDirectiveServiceProvider.addInjection('esn-application-menu', bpmnJs);

    $stateProvider
      .state('bpmn', {
        url: '/bpmn',
        templateUrl: '/bpmnJs/views/bpmn.html',
        controller: 'bpmnController'
      })
      ;
  }
]);
