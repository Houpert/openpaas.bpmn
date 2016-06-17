'use strict';

angular.module('esn.bpmn', [
  'op.dynamicDirective',
  'bpmn-js',
  'ui.router'
])

.config([
  '$stateProvider',
  'dynamicDirectiveServiceProvider',
  function($stateProvider, dynamicDirectiveServiceProvider) {
    var helloworld = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'application-menu-hello-world', {priority: 28});
    dynamicDirectiveServiceProvider.addInjection('esn-application-menu', helloworld);

    $stateProvider
      .state('helloworld', {
        url: '/helloworld',
        templateUrl: '/helloworld/views/index.html',
        controller: 'helloWorldController'
      })
      .state('bpmn', {
        url: '/bpmn',
        templateUrl: '/helloworld/views/test.html',
        controller: 'bpmnController'
      })
      ;
  }
]);
