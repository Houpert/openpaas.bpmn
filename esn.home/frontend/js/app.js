'use strict';

angular.module('esn.home', [
  'op.dynamicDirective',
  'ui.router'
])
.config([
  '$stateProvider',
  'dynamicDirectiveServiceProvider',
  function($stateProvider, dynamicDirectiveServiceProvider) {
    var home = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'application-menu-home-c2net', {priority: 28});
    dynamicDirectiveServiceProvider.addInjection('esn-application-menu', home);

    $stateProvider
      .state('homec2net', {
        url: '/home',
        templateUrl: '/home/views/index.html',
        controller: 'homeController'
      });
  }
]);
