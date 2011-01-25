var t = require('tobi');
var b = t.createBrowser(80, 'i.smashup.it');
b.get('/', function(res,$){ console.log($("body").html()) });
