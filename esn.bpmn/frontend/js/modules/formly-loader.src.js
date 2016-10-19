angular.module('esn.bpmn')

.factory('formlyLoader', function($http) {

  var check = function() {
    return require('api-check');
  };

  var formly = function() {
    return require('angular-formly');
  };

  return {
    check : check,
    formly : formly
  };
});
