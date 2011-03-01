var jsdom = require('jsdom').jsdom,
    request = require('request');

CSSChecker = function(options){

    this.options = {
        host: "http://"+options.host,
        pages: options.pages || [],
        engine: options.engine || "jsdom",
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

    // TODO checking if page is in cache
    this._fetchFile(o.host+page, function(body){

        var win = o._browser(body, null, o.jsdom_options).createWindow(),
            pageObj = {
                url: o.host+page,
                window: win,
                css: win.document.styleSheets
            };

        pageObj.css.forEach(function(cssObj){
            cssObj.href = self.utils.getFullUrl(cssObj.href, self.options.host);
        });

        pages.push(pageObj);

        callback.call(self, self.utils.getCache(o._pages, o.host+page, "window"));

    });

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

            var type = css.cssText && css.cssText.length ? "inline" : "external";

            if(type == "inline"){

                console.info("[processing inline css]");

                inlineCss += css.cssText+" ";

                if(--left == 0 && --pagesLeft == 0){
                    console.log("this is the last one: "+ left);
                    cssCache.push({
                        url: "inline",
                        cssText: inlineCss
                    });
                    self._collectRules();
                }

            } else {

                console.info("[processing "+css.href+"]");

                var url = self.utils.getFullUrl(css.href, self.options.host)

                self._fetchFile(url, function(body) {

                    console.log("fetching..."+url);

                    cssCache.push({
                        url: url,
                        cssText: body
                    });

                    if(--left == 0 && --pagesLeft == 0){
                        console.log("this is the last one: "+ left);
                        self._collectRules();
                    }

                });

            }

        })

    });

}

CSSChecker.prototype._collectRules = function(){

    var self = this;

    this.options._css.forEach(function(cssFile){
        cssFile["rules"] = self._parseCSSRules(cssFile["cssText"]);
    });

    this._analyzeUsage();

};

CSSChecker.prototype._analyzeUsage = function(){

    var self = this;

    this.options._pages.forEach(function(page){

        var cssUrls = [];

        page.css.forEach(function(cssObj){

            cssUrls.push(cssObj.href);

        });

        cssUrls.forEach(function(url){

            self.options._css.forEach(function(cssFile){

                if(cssFile.url == url) {
                    self._check(page, cssFile);   
                }

            });

        });

    });

};

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
    console.log("_checkedUsedRules deprecated");
    for(var i=0,l=this.options.pages.length;i<l;i++){
        this._visitPage(this.options.pages[i], this._check);
    }
}

CSSChecker.prototype._check = function(pageObj, cssObj){

    console.log(cssObj.rules.length);
    console.log("===");

    var rules = cssObj.rules.concat();

    var unusedRules = rules.filter(function(rule){
        try {
            return !pageObj.window.document.querySelectorAll(rule).length
        } catch(e){
            return false
        }
    });
    console.log("TODELETE: ["+cssObj.url+"] "+unusedRules.join(",\n"));
    console.log("===");
    console.log(unusedRules.length);
    console.log("\n");
    console.log("\n");
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
    },
    getFullUrl: function(resourceUrl, host){
        return resourceUrl.match(/^http/) ? resourceUrl : (resourceUrl[0] == "/" ? host+resourceUrl : host+"/"+resourceUrl)
    }
}

module.exports = CSSChecker;