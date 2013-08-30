//these settings are defined in the firmware (conf_defaults.lua) and will be initialized in loadSettings()
var settings = {
"network.ap.ssid": "d3d-ap-%%MAC_ADDR_TAIL%%",
"network.ap.address": "192.168.10.1",
"network.ap.netmask": "255.255.255.0",
"printer.temperature": 220,
"printer.objectHeight": '???',
"printer.layerHeight": 0.2,
"printer.wallThickness": 0.7,
"printer.speed": 50,
"printer.travelSpeed": 200,
"printer.filamentThickness": 2.85,
"printer.useSubLayers": true,
"printer.firstLayerSlow": true,
"printer.autoWarmUp": true,
"printer.simplify.iterations": 10,
"printer.simplify.minNumPoints": 15,
"printer.simplify.minDistance": 3,
"printer.retraction.enabled": true,
"printer.retraction.speed": 250,
"printer.retraction.minDistance": 1,
"printer.retraction.amount": 2,
"printer.autoWarmUpCommand": "M104 S220 (hardcoded temperature)" 
}

function SettingsWindow() {
	this.wifiboxURL;
	this.window;
	this.form;
	this.timeoutTime = 3000;
	this.retryDelay = 2000; 					// retry setTimout delay
	this.retryLoadSettingsDelay; 			// retry setTimout instance
	this.retrySaveSettingsDelay; 			// retry setTimout instance
	
	// Events
	SettingsWindow.SETTINGS_LOADED = "settingsLoaded";
	
	var self = this;
	
	this.init = function(wifiboxURL) {
		this.wifiboxURL = wifiboxURL;
	
		this.window = $("#settings");
		this.window.find(".btnOK").click(this.submitwindow);
	  this.window.find(".settings").load("settings.html", function() {
      console.log("Settings:finished loading settings.html, now loading settings...");
      
      self.form = self.window.find("form");
			self.form.submit(function (e) { self.submitwindow(e) });
			
      self.loadSettings();
	  });
	}
	this.submitwindow = function(e) {
		e.preventDefault();
	  e.stopPropagation();
	  self.saveSettings();
	  self.hideSettings();
	}
	
	this.showSettings = function() {
	  console.log("f:showSettings()");
	  
	  this.loadSettings(); // reload settings
	  
	  $("#contentOverlay").fadeIn(375, function() {
	    document.body.removeEventListener('touchmove',prevent,false);
	  });
	}
	this.hideSettings = function() {
		$("#contentOverlay").fadeOut(375, function() {
      document.body.addEventListener('touchmove',prevent,false);
    });
	}
	
	this.loadSettings = function() {
		if (!communicateWithWifibox) {
			console.log("     communicateWithWifibox is false: settings aren't being loaded from wifibox...")
			return;
		}
	  console.log("Settings:loadSettings() >> getting new data...");
		
		$.ajax({
		  url: this.wifiboxURL + "/config/all",
		  dataType: 'json',
		  timeout: this.timeoutTime,
		  success: function(data){
		  	console.log("Settings:loadSettings response: ",data);
		  	// TODO: no request status? 
		  	settings = data.data;
		  	console.log("  settings: ",settings);
		  	self.fillForm();
		  	$(document).trigger(SettingsWindow.SETTINGS_LOADED);
			}
		}).fail(function() { 
			console.log("Settings:loadSettings: failed");
			clearTimeout(self.retryLoadSettingsDelay);
			self.retryLoadSettingsDelay = setTimeout(function() { self.loadSettings() },self.retryDelay); // retry after delay
		});
	}
	
	this.saveSettings = function(callback) {
	  console.log("Settings:saveSettings");
	  
	  this.readForm();
	  
	  if (communicateWithWifibox) {
		  $.ajax({
			  url: this.wifiboxURL + "/config",
			  type: "POST",
			  data: settings,
			  dataType: 'json',
			  timeout: this.timeoutTime,
			  success: function(data){
			  	console.log("Settings:saveSettings response: ",data);
			  	if(data.status == "error") {
			  		clearTimeout(self.retrySaveSettingsDelay);
						self.retrySaveSettingsDelay = setTimeout(function() { self.saveSettings() },self.retryDelay); // retry after delay
			  	} else {
			  		var savedSettings = data.data;
				  	$.each(savedSettings, function(index, val) {
			        if (val != "ok") {
			          console.log("ERROR: value '" + index + "' not successfully set. Message: " + val);
			        }
			      });
			      // TODO something like a callback or feedback that saving went well / or failed
			      if (callback != undefined) {
			        callback();
			      }
			  	}
				}
			}).fail(function() { 
				console.log("Settings:saveSettings: failed");
				clearTimeout(self.retrySaveSettingsDelay);
				self.retrySaveSettingsDelay = setTimeout(function() { self.saveSettings() },self.retryDelay); // retry after delay
			});
	  }
	}
	
	this.fillForm = function() {
		console.log("SettingsWindow:fillForm");
		//fill form with loaded settings
		var selects = this.form.find("select");
		selects.each( function(index,element) {
			var element = $(element);
			element.val(settings[element.attr('name')]);
		});
		
		var inputs = this.form.find("input");
		inputs.each( function(index,element) {
			var element = $(element);
			//console.log("printer setting input: ",index,element.attr("type"),element.attr('name')); //,element);
			switch(element.attr("type")) {
				case "text": 
				case "number":  
					element.val(settings[element.attr('name')]);
					break;
				case "checkbox":
					element.prop('checked', settings[element.attr('name')]);
					break;
			}
		});
		
		var textareas = this.form.find("textarea");
		console.log(textareas);
		textareas.each( function(index,element) {
			var element = $(element);
			
			console.log("printer setting textarea: ",index,element.attr('name')); //,element);
			var value = settings[element.attr('name')];
			element.val(value);
			console.log("  value: ",value);
		});
	}
	
	this.readForm = function() {	
		console.log("SettingsWindow:readForm");
		var selects = this.form.find("select");
		selects.each( function(index,element) {
			var element = $(element);
			settings[element.attr('name')] = element.val();
		});
		
		var inputs = this.form.find("input");
		inputs.each( function(index,element) {
			var element = $(element);
			switch(element.attr("type")) {
				case "text": 
				case "number":  
					settings[element.attr('name')] = element.val();
					break;
				case "checkbox":
					settings[element.attr('name')] = element.prop('checked')
					break;
			}
		});
	
		var textareas = this.form.find("textarea");
		textareas.each( function(index,element) {
			var element = $(element);
			settings[element.attr('name')] = element.val();
		});
		console.log(settings);
	}
}

/*************************
 *
 *
 *  FROM DOODLE3D.INI
 *
 */
//TODO: find all references to these variables, replace them and finally remove these.
var objectHeight = 20;
var layerHeight = .2;
//var wallThickness = .5;
var hop = 0;
//var speed = 70;
//var travelSpeed = 200;
var enableTraveling = true;
//var filamentThickness = 2.89;
var minScale = .3;
var maxScale = 1;
var shape = "%";
var twists = 0;
var useSubLayers = true;
//var debug = false; // debug moved to main.js
var loglevel = 2;
var zOffset = 0;
var serverport = 8888;
var autoLoadImage = "hand.txt";
var loadOffset = [0, 0]; // x en y ?
var showWarmUp = true;
var loopAlways = false;
var firstLayerSlow = true;
var useSubpathColors = false;
var autoWarmUp = true;
var maxObjectHeight = 150;
var maxScaleDifference = .1;
var frameRate = 60;
var quitOnEscape = true;
var screenToMillimeterScale = .3; // 0.3
var targetTemperature = 230;
var simplifyiterations = 10;
var simplifyminNumPoints = 15;
var simplifyminDistance = 3;
var retractionspeed = 50;
var retractionminDistance = 5;
var retractionamount = 3;
var sideis3D = true;
var sidevisible = true;
var sidebounds = [900, 210, 131, 390];
var sideborder = [880, 169, 2, 471];
var windowbounds = [0, 0, 800, 500];
var windowcenter = true;
var windowfullscreen = false;
var autoWarmUpCommand = "M104 S230";
//var checkTemperatureInterval = 3;
var autoWarmUpDelay = 3;