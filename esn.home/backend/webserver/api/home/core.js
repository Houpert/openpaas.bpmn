'use strict';

function getMessage() {
  return 'Home Module';
}

module.exports = function(dependencies) {
  return {
    getMessage: getMessage
  };
};
