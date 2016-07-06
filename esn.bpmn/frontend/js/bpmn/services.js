'use strict';

angular.module('esn.bpmn')
  .factory('getHelloWorld', function($http) {
    return $http.get('/bpmnJs/api/sayhello').then(function(response) {
      return response.data.message;
    });
  });
