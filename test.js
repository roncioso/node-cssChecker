var CC = require('./main');

var u = new CC({
    host: 'lab.smashup.it',
    pages: [
        "/",
        "/flip"
    ],
    engine: 'jsdom'
});
