'use strict';

angular.module('esn.home')
  .directive('applicationMenuHomeC2net', function(applicationMenuTemplateBuilder) {
    return {
      retrict: 'E',
      replace: true,

      template: applicationMenuTemplateBuilder('/#/home', 'home', 'Home C2Net')
    };
  })

  .directive('listMenuDirective', function() {
    return {
      restrict: 'E',
      templateUrl: '/home/views/list-menu-directive.html'
    };
  })

  .directive('subMenuDirective', function() {
    return {
      restrict: 'E',
      scope:{
        moduleList: '='
      },
      templateUrl: '/home/views/sub-menu-directive.html'
    };
  })

  .directive('summaryDirective', function() {
    return {
      restrict: 'E',
      scope:{
        summaryList: '=',
        summaryTitle: '='
      },
      templateUrl: '/home/views/summary-directive.html'
    };
  });
