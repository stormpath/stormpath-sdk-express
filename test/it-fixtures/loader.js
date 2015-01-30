var fs = require('fs');
var path = require('path');

module.exports = function(fixtureName) {

  var fixturePath = path.join(__dirname,fixtureName);

  if(fs.existsSync(fixturePath)){
    return require(fixturePath);
  }else{
    throw new Error('Fixture file does not exist: '+fixturePath);
  }
};