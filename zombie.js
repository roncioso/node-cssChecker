var zombie = require('zombie'),
    request = require('request');

var host = "http://i.smashup.it";

browser = new zombie.Browser({ debug: false })
browser.runScripts = false;

browser.visit(host, function(e, browser, status){
	
	var cssFiles = browser.document.styleSheets,
	    fetched = 0,
	    rules = [],
	    usedRules = [];

	for(var i=0;i<cssFiles.length;i++){
	    var _href = "";
	    console.log("CHECKING.... "+cssFiles[i].href);
	    if(cssFiles[i].href.match(/$http/)){
		console.log('external');
		_href = cssFiles[i].href;
	    } else {
		console.log('internal');
		_href = host+"/"+cssFiles[i].href
            }
	    request({
		uri: _href
	    }, function(e,r,b){
		fetched = ++fetched;
		getCSSRules(b).forEach(function(i){
			rules.push(i);
		});
		if(fetched==cssFiles.length){
			rules.forEach(function(r, i){
				try {
					if(browser.document.querySelectorAll(r).length){
						usedRules.push(r);
					}
				} catch(e) {
//					console.log('error '+e);
				}
			});
			console.log('~~~~~~~~~~~~~~~~~~~~~~~');
			console.log(usedRules.length +"|"+ rules.length);			
			console.log('~~~~~~~~~~~~~~~~~~~~~~~');
		}
	    });		
	}
});

var getCSSRules = function(css){
	css = css.replace(/\/\*([^\*\/]*)\*\//gi,"") // Removing comments
	var rules = css.replace(/\{([^}]*)\}/gi,", "); //
	rules = rules.replace(/(\r\n|[\r\n])/g, "");
	rules = rules.split(',');
	var r = []
	rules.forEach(function(i){
		r.push(i.trim());
	});
	return r;
}
