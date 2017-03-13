'use strict';

angular.module('esn.home')
  .factory('getHelloWorld', function($http) {
    return $http.get('/home/api/sayhello').then(function(response) {
      return response.data.message;
    });
  });
