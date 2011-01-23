var zombie = require('zombie'),
    request = require('request'),

CSSChecker = function(options){

    this.options = {
        host: "http://"+options.host,
        pages: options.pages,
        _browser: null,
        _rules: [],
        _usedRules: []
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

    var fetchedCSS = 0,
        cssFiles = null,
        self = this;

    this.options._browser.visit(this.options.host, function(e, browser, status){

        cssFiles = browser.document.styleSheets;

        if(!cssFiles){
            return
        }

        for(var i=0,l=cssFiles.length;i<l;i++){
            var _href = cssFiles[i].href.match(/$http/) ? cssFiles[i].href : self.options.host+"/"+cssFiles[i].href
            console.log("check "+_href);
            self._fetchFile(_href, function(b){
                console.log("done...")
            })
        }

    });
}

CSSChecker.prototype.collectStylesheets = function(){

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