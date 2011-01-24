var zombie = require('zombie'),
    request = require('request'),

CSSChecker = function(options){

    this.options = {
        host: "http://"+options.host,
        pages: options.pages,
        _browser: null,
        _rules: [],
        _usedRules: [],
        _counter: {
            'css': 0,
            'parsed': 0
        }
    };

    this.init();
};

CSSChecker.prototype.init = function(){
    this._initBrowser();
    this._visitPage(this.options.pages[0]);
}

CSSChecker.prototype._initBrowser = function(){
    this.options._browser = new zombie.Browser({ debug: false })
    this.options._browser.runScripts = false;
}

CSSChecker.prototype._visitPage = function(page){

    var cssFiles = null,
        self = this;

    this.options._browser.visit(this.options.host, function(e, browser, status){

        cssFiles = browser.document.styleSheets;
        self.options._counter.css = self.options._counter.css + browser.document.styleSheets.length 

        if(!cssFiles){
            return
        }

        for(var i=0,l=cssFiles.length;i<l;i++){
            var _href = cssFiles[i].href.match(/$http/) ? cssFiles[i].href : self.options.host+"/"+cssFiles[i].href
            if(_href == self.options.host+"/"){
                console.log("checking inline stylesheets...");
                self._collectRules(cssFiles[i].cssText);
            } else {
                console.log("checking "+_href);
                self._fetchFile(_href, function(body){
                    self._collectRules(body)
                })
            }
        }

    });
}

CSSChecker.prototype._collectRules = function(css){
    // Populatin rules array...
    this.options._rules = this.options._rules.concat(this._parseCSSRules(css));

    // Counting css...
    this.options._counter.parsed = this.options._counter.parsed+1;

    if(this.options._counter.parsed == this.options._counter.css){
        console.log('finito');
    }
}

CSSChecker.prototype._parseCSSRules = function(css){
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

CSSChecker.prototype._fetchFile = function(url, cb){
    request({
        uri: url
    }, function(e, r, b){
        return cb(b)
    })
}

module.exports = CSSChecker;