var TerraformError = require("../../error").TerraformError;
var MarkdownIt = require('markdown-it');

var md = new MarkdownIt('default');

module.exports = function(fileContents, options){

  return {
    compile: function(){
      return function (locals) {
        return md.render(fileContents.toString().replace(/^\uFEFF/, ''), locals);
      };
    },

    parseError: function(error){
      error.stack = fileContents.toString();
      return new TerraformError(error);
    }
  };

};
