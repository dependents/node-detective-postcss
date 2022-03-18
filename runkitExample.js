const detective = require('detective-postcss');

// list of imported file names (ex: 'bla.css', 'foo.css', etc.)
const content = `
    .my_class {
        background: url("myFile.png");
    }`;

// or to also detect any url() references to images, fonts, etc.
const allDependencies = detective(content, { url: true });
