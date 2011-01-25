var t = require('tobi');
var b = t.createBrowser(80, 'google.com', {external:false});
console.log(b);
b.get('/', function(res,$){  });
