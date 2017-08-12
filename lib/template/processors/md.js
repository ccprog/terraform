var TerraformError = require("../../error").TerraformError;
var md = require('markdown-it')({ html: true });

const shorcodeRE = /@\[([\w-]+)\]\((.*)\)?\)/im;
const stringRE = /^\s*("|')(.*?)\1\s*$/;
const jsonRE = /^\s*(\{.*\})\s*$/;

function argParser (str) {
  const quoted = stringRE.exec(str);
  if (quoted) {
    return quoted[2];
  }
  const json = jsonRE.exec(str);
  if (json) {
    return JSON.parse(json[1]);
  }
  return null;
}

function shortcodeRule (state, startLine, endLine, silent) {
  let startPos = state.bMarks[startLine] + state.tShift[startLine];
  let maxPos = state.eMarks[startLine];

  let pointer = {
    line: startLine, 
    pos: startPos 
  };

  // Check if it's @[tag](arg)
  if (state.src.charCodeAt(pointer.pos) !== 0x40/* @ */ ||
      state.src.charCodeAt(pointer.pos + 1) !== 0x5B/* [ */) {
    return false;
  }

  const block = state.src.slice(startPos, maxPos);
  const match = shorcodeRE.exec(block);

  if (!match || match.length < 3) {
    return false;
  }

  const [all, id, args] = match;
  const arglist = args.split(';').map(argParser);

  switch (id) {
  case 'partial':
    const [path, locals] = arglist;
    console.log(path, locals)
    if (typeof path !== 'string' || (locals && typeof locals !== 'object')) return false;

    if (startLine !== 0) {
      let prevLineStartPos = state.bMarks[startLine - 1] + state.tShift[startLine - 1];
      let prevLineMaxPos = state.eMarks[startLine - 1];
      if (prevLineMaxPos > prevLineStartPos) return false;
    }
      
    pointer.pos += all.length;
    
    // Block embed must be at end of input or the next line must be blank.
    if (endLine !== pointer.line + 1) {
      let nextLineStartPos = state.bMarks[pointer.line + 1] + state.tShift[pointer.line + 1];
      let nextLineMaxPos = state.eMarks[pointer.line + 1];
      if (nextLineMaxPos > nextLineStartPos) return false;
    }

    if (pointer.line >= endLine) return false;

    if (!silent) {
      let token = state.push('shortcode', 'div', 0);
      token.markup = state.src.slice(startPos, pointer.pos);
      token.info = { path, locals };
      token.block = true;
      token.map = [ startLine, pointer.line + 1 ];
      state.line = pointer.line + 1;
    }

    return true;
  default:
    return false;
  }
}

function shortcodeRender (tokens, idx, options, env) {
  const { path, locals } = tokens[idx].info;
  return env.partial(path, locals) + '\n';
}

md.use(function (md) {
  md.renderer.rules.shortcode = shortcodeRender;

  md.block.ruler.before('fence', 'shortcode', shortcodeRule, {
    alt: [ 'paragraph', 'reference', 'blockquote', 'list' ] 
  });
});

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
