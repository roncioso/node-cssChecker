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
            'parsed': 0,
            'processedPages': 0
        },
        jsdom_options: {
            features: {
                QuerySelector: true,
                FetchExternalResources: ["css", "link"],
                ProcessExternalResources : false
            }
        },
        _pages: [],
        _css: []
    };

    this.init();
};

CSSChecker.prototype.init = function(){
    this._initBrowser();

    var self = this,
        left = this.options.pages.length;

    this.options.pages.forEach(function(page){

        self._visitPage(page, function(){

            if(--left == 0){
                console.log("processed "+this.options.pages.length+" pages\n\n");
                self._findCss()
            };

        })

    });
    
}

CSSChecker.prototype._initBrowser = function(){
    console.log('[init browser using JSDOM]');
    this.options._browser = jsdom;
}

CSSChecker.prototype._visitPage = function(page, callback){

    var self = this,
        o = this.options,
        pages = o._pages;

    /* TODO checking if page is in cache
    if(this.utils.getCache(o._pages, o.host+page, "window")){

        console.log("[page is already here...]");

        callback.call(self, self.utils.getCache(o._pages, o.host+page, "window"));

    } else {

        console.log("[page is not in cache...fetching...]");
*/
        this._fetchFile(o.host+page, function(body){

            var win = o._browser(body, null, o.jsdom_options).createWindow()

            pages.push({
                url: o.host+page,
                window: win,
                css: win.document.styleSheets
            })
            
            callback.call(self, self.utils.getCache(o._pages, o.host+page, "window"));

        });
        
    //}
    
}

CSSChecker.prototype._findCss = function(){

    var pages = this.options._pages,
        pagesLeft = pages.length,
        cssCache = this.options._css,
        self = this,
        inlineCss = "";

    this.options._pages.forEach(function(page){

        var cssFiles = page.css,
            left = cssFiles.length;

        cssFiles.forEach(function(css){

            var type = css.cssText.length ? "inline" : "external";

            if(type == "inline"){

                console.info("[processing inline css]");

                inlineCss += css.cssText+" ";

                if(--left == 0 && --pagesLeft == 0){
                    console.log("this is the last one: "+ left);
                    cssCache.push({
                        url: "inline",
                        cssText: inlineCss
                    });
                    self._collectStylesheets();
                }

            } else {

                console.info("[processing "+css.href+"]");

                var url = css.href.match(/^http/) ? css.href : (css.href[0] == "/" ? self.options.host+css.href : self.options.host+"/"+css.href);

                self._fetchFile(url, function(body) {

                    console.log("fetching..."+url);

                    cssCache.push({
                        url: url,
                        cssText: body
                    });

                    if(--left == 0 && --pagesLeft == 0){
                        console.log("this is the last one: "+ left);
                        self._collectStylesheets();
                    }

                });

            }

        })

    });

}

CSSChecker.prototype._collectStylesheets = function(window){

    this.options._css.forEach(function(cssFile){
        console.log(cssFile.url)
    })

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

        if(arguments.length==1){
            return whereObj
        }

        if(prop && whereObj[name] && whereObj[name][prop]){
            return whereObj[name][prop]
        } else {
            return whereObj[name]
        }
    }
}

module.exports = CSSChecker;