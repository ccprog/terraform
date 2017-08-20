var TerraformError = require("../../error").TerraformError;
var md = require('markdown-it')({ html: true, linkify: true });

const shortcodes = {
  partial: {
    render: function (locals, env) {
      const path = locals.src;
      if (!path) throw new TerraformError({
        source: "Markdown partial tag",
        dest: "HTML",
        message: 'no path to partial found',
        stack: locals
      });
      delete locals.src;

      return env.partial(path, locals) || '';
    }
  },

  local: {
    inline: true,
    render: function (locals, env) {
      const name = Object.getOwnPropertyNames(locals)[0];
      if (!name || locals[name] !== true) throw new TerraformError({
        source: "Markdown variable tag",
        dest: "HTML",
        message: 'malformed attributes',
        stack: JSON.stringify(locals, null, 2)
      });

      return env[name];
    }
  }
};

md.use(require('markdown-it-shortcode-tag'), shortcodes);

module.exports = function(fileContents, options){

  return {
    compile: function(){
      return function (locals) {
        return md.render(fileContents.toString().replace(/^\uFEFF/, ''), locals);
      };
    },

    parseError: function(error){
      error.stack += '\n' + fileContents.toString();
      return new TerraformError(error);
    }
  };

};
