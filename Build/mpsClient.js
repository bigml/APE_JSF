var APE = {
	Config: {
		identifier: 'ape',
		init: true,
		frequency: 0,
		scripts: []
	},

	Client: function(core) {
			if(core) this.core = core;
	}
}
APE.Client.prototype.eventProxy = [];
APE.Client.prototype.fireEvent = function(type, args, delay) {
	this.core.fireEvent(type, args, delay);
}

APE.Client.prototype.addEvent = function(type, fn, internal) {
	var newFn = fn.bind(this), ret = this;
	if(this.core == undefined){
		this.eventProxy.push([type, fn, internal]);
	}else{
		var ret = this.core.addEvent(type, newFn, internal);
		this.core.$originalEvents[type] = this.core.$originalEvents[type] || [];
		this.core.$originalEvents[type][fn] = newFn;
	}
	return ret;
}
APE.Client.prototype.removeEvent = function(type, fn) {
	return this.core.removeEvent(type, fn);
}

APE.Client.prototype.onRaw = function(type, fn, internal) {
		this.addEvent('raw_' + type.toLowerCase(), fn, internal);
}

APE.Client.prototype.onCmd = function(type, fn, internal) {
		this.addEvent('cmd_' + type.toLowerCase(), fn, internal);
}

APE.Client.prototype.onError = function(type, fn, internal) {
		this.addEvent('error_' + type, fn, internal);
}

APE.Client.prototype.cookie = {};

APE.Client.prototype.cookie.write = function (name, value, domain) {
	   if (domain == 'auto') domain = document.domain;
	   document.cookie = name + "=" + encodeURIComponent(value) + ";path=/ ; domain=" + domain;
 }

APE.Client.prototype.cookie.read = function (name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0){
			return decodeURIComponent(c.substring(nameEQ.length,c.length));
		}
	}
	return null;
}

APE.Client.prototype.load = function(config){

	config = config || {};

	config.transport = config.transport || APE.Config.transport || 0;
	config.frequency = config.frequency || 0;
	config.domain = config.domain || APE.Config.domain || document.domain;
	config.scripts = config.scripts || APE.Config.scripts;
	config.server = config.server || APE.Config.server;
	config.secure = config.sercure || APE.Config.secure;

	config.init = function(core){
		this.core = core;
		for(var i = 0; i < this.eventProxy.length; i++){
			this.addEvent.apply(this, this.eventProxy[i]);
		}
	}.bind(this);

	//set document.domain
	if (config.transport != 2) {
		if (config.domain != 'auto') document.domain = config.domain;
		if (config.domain == 'auto') document.domain = document.domain;
	}

	//Get APE cookie
	var cookie = this.cookie.read('APE_Cookie');
	var tmp = eval('(' + cookie + ')');

	if (tmp) {
		config.frequency = tmp.frequency+1;
	} else {
		cookie = '{"frequency":0}';
	}

	var reg = new RegExp('"frequency":([ 0-9]+)' , "g")
	cookie = cookie.replace(reg, '"frequency":' + config.frequency);
	this.cookie.write('APE_Cookie', cookie, config.domain);

	var iframe = document.createElement('iframe');
	iframe.setAttribute('id','ape_' + config.identifier);
	iframe.style.display = 'none';
	iframe.style.position = 'absolute';
	iframe.style.left = '-300px';
	iframe.style.top = '-300px';

	document.body.insertBefore(iframe,document.body.childNodes[0]);

	if (config.transport == 2) {
		var doc = iframe.contentDocument;
		if (!doc) doc = iframe.contentWindow.document;//For IE

		//If the content of the iframe is created in DOM, the status bar will always load...
		//using document.write() is the only way to avoid status bar loading with JSONP
		doc.open();
		var theHtml = '<html><head>';
		for (var i = 0; i < config.scripts.length; i++) {
			theHtml += '<script type="text/JavaScript" src="' + config.scripts[i] + '"></script>';
		}
		theHtml += '</head><body></body></html>';
		doc.write(theHtml);
		doc.close();
	} else {
		iframe.setAttribute('src',(config.secure ? 'https': 'http') + '://' + config.frequency + '.' + config.server + '/?[{"cmd":"script","params":{"domain":"' + document.domain +'","scripts":["' + config.scripts.join('","') + '"]}}]');
		if (navigator.product == 'Gecko') {
			//Firefox fix, see bug #356558
			// https://bugzilla.mozilla.org/show_bug.cgi?id=356558
			iframe.contentWindow.location.href = iframe.getAttribute('src');
		}
	}

	onIframeLoad = function() {
		if (!iframe.contentWindow.APE) setTimeout(onIframeLoad, 100);//Sometimes IE fire the onload event, but the iframe is not load
			else iframe.contentWindow.APE.init(config);
	};

	setTimeout(onIframeLoad, 100);

}

if (Function.prototype.bind == null) {
	Function.prototype.bind = function(bind, args) {
		return this.create({'bind': bind, 'arguments': args});
	}
}
if (Function.prototype.create == null) {
	Function.prototype.create = function(options) {
			var self = this;
			options = options || {};
			return function(){
				var args = options.arguments || arguments;
				if(args && !args.length){
					args = [args];
				}
				var returns = function(){
					return self.apply(options.bind || null, args);
				};
				return returns();
			};
	}
}

/***
 * APE JSF Setup
 */
APE.Config.baseUrl = 'http://js.hunantv.com/hn/mps'; //APE JSF 
APE.Config.domain = 'hunantv.com'; //Your domain, must be the same than the domain in aped.conf of your server
APE.Config.server = 'push.hunantv.com'; //APE server URL

(function(){
	for (var i = 0; i < arguments.length; i++)
		APE.Config.scripts.push(APE.Config.baseUrl + '/Build/' + arguments[i] + '.js');
})('mpsCore');