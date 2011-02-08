var jsdom = require('jsdom').jsdom,
    request = require('request');

//TODO provide external adapters

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
        },
        jsdom_options: {
            features: {
                QuerySelector: true,
                FetchExternalResources: ["css", "link"],
                ProcessExternalResources : false
            }
        },
        _pages: {},
        _css: {}
    };

    this.init();
};

CSSChecker.prototype.init = function(){
    this._initBrowser();
    
    for(var i=0,l=this.options.pages.length;i<l;i++){
        this._visitPage(this.options.pages[i], this._collectStylesheets);
    }
}

CSSChecker.prototype._initBrowser = function(){
    console.log('[init browser using JSDOM]');
    this.options._browser = jsdom;
}

CSSChecker.prototype._visitPage = function(page, callback){

    var self = this,
        o = this.options;

    //checking if page is in cache
    if(this.utils.getCache(o._pages, o.host+page, "window")){

        console.log("[page is already here...]");

        callback.call(self, {
            window: self.utils.getCache(o._pages, o.host+page, "window")
        });

    } else {

        console.log("[page is not in cache...fetching...]");

        this._fetchFile(o.host+page, function(body){

            self.utils.setCache(o._pages, o.host+page, {
                window: o._browser(body, null, o.jsdom_options).createWindow()
            });
            
            callback.call(self, self.utils.getCache(o._pages, o.host+page, "window"));

        });
        
    }
    
}

CSSChecker.prototype._collectStylesheets = function(window){

    var cssFiles = window.document.styleSheets,
        self = this,
        o = this.options,
        fetcherCounter = 0;

    //TODO cache every stylesheet with info where is used

    o._counter.css = o._counter.css + window.document.styleSheets.length

    if(!cssFiles){
        return
    }

    for( var i=0, l=cssFiles.length ; i<l ; i++ ){

        var _href = cssFiles[i].href.match(/$http/) ? cssFiles[i].href : o.host+"/"+cssFiles[i].href;

        if(_href == o.host+"/"){
            console.log("checking inline stylesheets...");

            this.utils.setCache(o._css, "inline", {
                cssText: cssFiles[i].cssText
            });

            fetcherCounter = fetcherCounter+1;

            if(fetcherCounter == cssFiles.length){
                console.log("okay this is the latest stylesheet let's process it");
                this._collectRules(cssFiles[i].cssText);
            }

        } else {

            console.log("checking "+_href);

            this._fetchFile(_href, function(body){

                self.utils.setCache(o._css, _href, {
                    cssText: body
                });

                fetcherCounter = fetcherCounter+1;

                if(fetcherCounter == cssFiles.length){
                    console.log("okay this is the latest stylesheet let's process it");
                    self._collectRules(body)
                }
            });

        }
        
    }

}

CSSChecker.prototype._collectRules = function(css){

    var cssCache = this.utils.getCache(this.options, "_css"),
        o = this.options;

    for(var i in cssCache){
        console.log("A")
        if(!cssCache[i].parsed || cssCache[i].parsed != true){
            console.log("B")
            // Populatin rules array...
            o._rules = o._rules.concat(this._parseCSSRules(cssCache[i].cssText));

            // Counting css...
            this.options._counter.parsed = this.options._counter.parsed+1;

            cssCache[i].parsed = true;

            if(this.options._counter.parsed == this.options._counter.css){
                console.log("C")
                console.log('>>> found '+this.options._rules.length+" rules to analyze");
                this._checkUsedRules();
            }

        }
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

    //TODO it misses features for zombie
    //TODO compact _check method

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
    } else {
        for(var i=0,l=this.options._rules.length; i<l; i++){
            try {
                if(options.window.document.querySelectorAll(this.options._rules[i]).length){
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

CSSChecker.prototype.utils = {
    setCache: function(whereObj, name, whatObj){
        if(whereObj){
            whereObj[name] = whatObj
        }
    },
    getCache: function(whereObj, name, prop){
        if(prop && whereObj[name] && whereObj[name][prop]){
            return whereObj[name][prop]
        } else {
            return whereObj[name]
        }
    }
}

module.exports = CSSChecker;