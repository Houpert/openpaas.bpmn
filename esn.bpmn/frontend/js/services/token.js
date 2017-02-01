'use strict';

angular.module('esn.bpmn')
  .factory('tokenService', function(tokenAPI) {

    var getToken = function() {
      return tokenAPI.getNewToken().then(function(response) {
        return response.data;
      });
      //return tokenAPI.getNewToken();
    };
    return {
      getToken:getToken
    };
  }
);
