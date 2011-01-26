var zombie = require('zombie'),
    request = require('request'),
    tobi = require('tobi');

CSSChecker = function(options){

    this.options = {
        host: "http://"+options.host,
        pages: options.pages || [],
        engine: options.engine || "zombie",
        port: options.port || 80,
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
    
    for(var i=0,l=this.options.pages.length;i<l;i++){
        this._visitPage(this.options.pages[i], this._getStylesheets);
    }
}

CSSChecker.prototype._initBrowser = function(){
    if(this.options.engine === "zombie"){
        console.log('[using ZOMBIE engine]');
        this.options._browser = new zombie.Browser({ debug: false })
        this.options._browser.runScripts = false;
    } else {
        console.log('[using TOBI engine]');
        this.options._browser = tobi.createBrowser(this.options.port, this.options.host.replace("http://", ""))
    }
}

CSSChecker.prototype._visitPage = function(page, callback){

    var cssFiles = null,
        self = this;

    if(this.options.engine === "zombie"){
        console.log('zombie...')
        this.options._browser.visit(this.options.host, function(e, browser, status){
            if(e) return
            callback.call(self, {
                browser: browser,
                status: status
            })
        });
    } else {
        console.log('tobi...')
        this.options._browser.get(page, function(res, $){
            callback.call(self, {
                "$": $
            })
        });
    }
}

CSSChecker.prototype._getStylesheets = function(opts){

    var options = {
        browser: opts.browser || null,
        status: opts.status || null,
        $: opts.$ || null
    }

    if(options.browser && options.status && options.status>=200 && options.status <= 300){
        this._collectStylesheets(true, options.browser);
    } else if(options.$) {
        this._collectStylesheets(false, null, options.$)
    }

}

CSSChecker.prototype._collectStylesheets = function(hasDocument, browser, $){

    var cssFiles = null,
        self = this;

    if(!hasDocument){

        cssFiles = $("link[rel*=stylesheet], style");
        this.options._counter.css = this.options._counter.css + cssFiles.length

        if(!cssFiles.length){
            return
        }

        for(var i=0, l=cssFiles.length;i<l;i++){
            var _href = cssFiles.eq(i).attr("href") && this.options.host+"/"+cssFiles.eq(i).attr("href");
            if(_href){
                console.log("checking "+_href)
                this._fetchFile(_href, function(body){
                   self._collectRules(body); 
                });
            } else {
                console.log("checking inline stylesheet")
                self._collectRules(cssFiles.eq(i).html());
            }
        }

    } else {

        cssFiles = browser.document.styleSheets

        this.options._counter.css = this.options._counter.css + browser.document.styleSheets.length

        if(!cssFiles){
            return
        }

        for(var i=0,l=cssFiles.length;i<l;i++){
            var _href = cssFiles[i].href.match(/$http/) ? cssFiles[i].href : this.options.host+"/"+cssFiles[i].href
            if(_href == this.options.host+"/"){
                console.log("checking inline stylesheets...");
                this._collectRules(cssFiles[i].cssText);
            } else {
                console.log("checking "+_href);
                this._fetchFile(_href, function(body){
                    self._collectRules(body)
                })
            }
        }

    }
}

CSSChecker.prototype._collectRules = function(css){
    // Populatin rules array...
    this.options._rules = this.options._rules.concat(this._parseCSSRules(css));

    // Counting css...
    this.options._counter.parsed = this.options._counter.parsed+1;

    if(this.options._counter.parsed == this.options._counter.css){
        console.log('>>> found '+this.options._rules.length+" rules to analyze");
        this._checkUsedRules();
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

CSSChecker.prototype._checkUsedRules = function(){

    for(var i=0,l=this.options.pages.length;i<l;i++){
        this._visitPage(this.options.pages[i], this._check);
    }

}

CSSChecker.prototype._check = function(options){

    if(options.$){
        for(var i=0,l=this.options._rules.length; i<l; i++){
            try {
                if(options.$(this.options._rules[i]).length){
                    this.options._usedRules.push(this.options._rules[i])
                }
            } catch(e) {
                //some errors...
            }
        }

        console.log("===");
        console.log(this.options._rules.length - this.options._usedRules.length +" unused rules in this page");
    }

}

module.exports = CSSChecker;