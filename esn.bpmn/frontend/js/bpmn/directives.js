'use strict';

angular.module('esn.bpmn')
  .directive('applicationMenuHelloWorld', function(applicationMenuTemplateBuilder) {
    return {
      retrict: 'E',
      replace: true,
      template: applicationMenuTemplateBuilder('/#/bpmn', 'mdi-thumb-up', 'BPMN')
    };
  })
  .directive('dir1', function() {
    return {
      restrict: 'E',
      template: '<div>Item X</div>'
    };
  })
  .directive('dir2', function() {
    return {
      restrict: 'E',
      template: '<div>Item Y</div>'
    };
  })
  .directive('addButton', ['dynamicDirectiveService', function(dynamicDirectiveService) {
    return {
      restrict: 'A',
      link: function (scope) {
        var dir2 = new dynamicDirectiveService.DynamicDirective(
          function(scope) {return true;},
          'dir2'
        );
        scope.add = function() {
          console.log('Add directive logger');
          dynamicDirectiveService.addInjection('anchorPoint1', dir2);
        };
      }
    };
  }]);
