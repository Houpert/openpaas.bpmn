'use strict';

angular.module('esn.home')
  .directive('applicationMenuHomeC2net', function(applicationMenuTemplateBuilder) {
    return {
      retrict: 'E',
      replace: true,

      template: applicationMenuTemplateBuilder('/#/home', 'home', 'Home C2Net')
    };
  })

  .directive('listmenudirective', function() {
    return {
      restrict: 'E',
      templateUrl: '/home/views/list-menu-directive.html'
    };
  })

  .directive('submenudirective', function() {
    return {
      restrict: 'E',
      scope:{
        moduleList: '='
      },
      templateUrl: '/home/views/sub-menu-directive.html'
    };
  });
