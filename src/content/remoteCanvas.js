/* **** BEGIN LICENSE BLOCK *****
The contents of this file are subject to the Mozilla Public License
Version 1.1 (the "License"); you may not use this file except in
compliance with the License. You may obtain a copy of the License at
http://www.mozilla.org/MPL/

Software distributed under the License is distributed on an "AS IS"
basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
License for the specific language governing rights and limitations
under the License.

The Original Code is New Tab JumpStart.

The Initial Developer of the Original Code is Mihailo Lalevic.
Copyright (C) 2008, Mihailo Lalevic. All Rights Reserved.

Contributor(s): 
**** END LICENSE BLOCK **** */


var mlalevic;
if (!mlalevic) {
    mlalevic = {};
}

if (!mlalevic.Utils) {
    mlalevic.Utils = {};
}

if (!mlalevic.Utils.UI) {
    mlalevic.Utils.UI = {};
}

if(!mlalevic.JumpStart){
  mlalevic.JumpStart = {};
}

if(!mlalevic.JumpStart.Services){
  mlalevic.JumpStart.Services = {};
}

if (!mlalevic.UnitTests) { //If unit testing skip importing module
  Components.utils.import("resource://modules/utils.js", mlalevic.Utils);
  Components.utils.import("resource://modules/browserServices.js", mlalevic.JumpStart.Services);
}

(function() {

  var ui = mlalevic.Utils.UI;
  var Utils = mlalevic.Utils;
  var Logger = mlalevic.JumpStart.Services.Logger;
  
  var Measurement = function(aContent, aCanvas, aWindow){
    if(!aContent || !aCanvas || !aWindow){
      throw new Error("Measurement arguments null.");
    }
    this.content = aContent;
    this.canvas = aCanvas;
    this.window = aWindow;
    Logger.debug('New measurement: ', this.toString());
  }
  
  Measurement.CANVAS_WIDTH = 294;
  Measurement.CANVAS_HEIGHT = 204;
  Measurement.WINDOW_WIDTH = 999;
  Measurement.WINDOW_HEIGHT = 694;
  
  Measurement.prototype = {
    content : null,
    canvas : null,
    window : null,
    cutoff : 0,
    cutoffHalf : 0,
    offset : 0,
    _heightAdjustment : function(){
      if (this.content.h < this.window.h) {
        this.cutoff = Math.round(this.window.w * (1 - this.content.h / this.window.h));
        this.cutoffHalf = Math.round(this.cutoff / 2);
        this.window.h = this.content.h;
      }
    },
    //if content wider then window width - center content in window
    _widthAdjustment : function(){
      if (this.content.w > Measurement.WINDOW_WIDTH) {
        //center it
        this.offset = Math.round((this.content.w - Measurement.WINDOW_WIDTH) / 2);
      }
    },
    calculate : function(){
      this._heightAdjustment();
      this._widthAdjustment();
      if (this.window.h <= 0 || (this.window.w - this.cutoff) <= 0) {
        throw new Error("Measurements invalid: " + this.toString());
      }
      
      return {
        scale : {
          x : this.canvas.w / (this.window.w - this.cutoff),
          y : this.canvas.h / this.window.h
        },
        border : {
          x : this.offset + this.cutoffHalf,
          y : 0,
          w : this.content.w - this.offset + this.cutoffHalf,
          h : this.window.h
        }
      };
    },
    toString : function(){
      return "Measurements: " +
             " Canvas( " + this._getString(this.canvas) + " )," + 
             " Window( " + this._getString(this.window) + " )," + 
             " Content( " + this._getString(this.content) + " )";
    },
    _getString : function(dim){
      if(!dim) return "null";
      return dim.w +" X " + dim.h;
    }
  }
  
  var Canvas = function(aCanvas, aMeasurement){
    this.canvas = aCanvas;
    this.measurement = aMeasurement;
  }
  
  Canvas.prototype = {
    canvas : null,
    measurement : null,
    draw : function(content){
      Logger.debug('Start rendering');
      var scale = this.measurement.scale;
      var border = this.measurement.border;
      
      var ctx = this.canvas.getContext("2d");
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.save();
      ctx.scale(scale.x, scale.y);
      ctx.drawWindow(content,  border.x, border.y, border.w, border.h, "rgb(255,255,255)");
      ctx.restore();
      var result = this.canvas.toDataURL("image/png", "");
      Logger.debug('Rendered: ', result);
      return result;
    }
  }
  
  
  var PageLoader = function(url, onFinished, uiProviderFactory, storage){
    if(!uiProviderFactory){
      throw new Error("No UI Provider Factory");
    }
    
    if(!storage){
      throw new Error("No Storage provided");
    }
    
    this.url = url;
    this.onFinished = onFinished;
    this.uiProvider = uiProviderFactory.Load(url);
    this.storage = storage;
  }
  
  PageLoader.prototype = {
    url : null,
    fallback : false,
    onFinished : null,
    uiProvider : null,
    storage : null,
    Start : function(){
      Logger.debug('Start loading:', this.url);
      var loader = this;
      this.fallback = false;
      this.uiProvider.Load(function(){loader.Loaded();});
    },
    Fallback : function(){
      Logger.info('Fallback', this.url);
      try{
        this.uiProvider.browser.stop();
        if(this.fallback){
          Logger.warning('Already Fallen', this.url);
          return false; //finish processing
        }
        this.fallback = true;
        this.uiProvider.FallbackReload();
        return true; //continue working, don't stop
      }catch(ex){
        Logger.error('Fallback exception', ex.message); //finish processing
        return false;
      }
    },
    Loaded : function(){
      Logger.debug('Loaded:', this.url);
      var content = this.uiProvider.browser.contentWindow;
      if(content.document.height == 0){
        if(this.Fallback()){
          return;
        }
      }
      
      if(this.fallback && content.document.height == 0){
        Logger.debug('Using fallback content', this.url);
        try{
          var fallback = this.uiProvider.GetFallbackContent();
          this._Loaded(fallback.content, fallback.rect);
        }catch(ex){
          Logger.error('Error getting fallback content', ex.message);
        }
      }else{
        this._Loaded(content, {w: content.document.width, h: content.document.height});
      }
      //this._Loaded(content);
    },
    _Loaded : function(content, contentRect){
     try{
        var m = new Measurement(
          contentRect,
          {w: this.uiProvider.canvas.width, h: this.uiProvider.canvas.height}, 
          {w: Measurement.WINDOW_WIDTH, h: Measurement.WINDOW_HEIGHT}
        ).calculate();
        
        this.storage.save(new Canvas(this.uiProvider.canvas, m).draw(content));
      } catch(ex) {
        Logger.error("Error Drawing", ex.message);
      }

      try{
        this.Finished();
      } catch(ex) {
        Logger.error("Error Removing Tab", ex.message);
      }
    },
    Finished : function(){
      this.uiProvider.Stop();
      this.uiProvider = null;
      this.storage = null;
      Logger.debug('Finished:', this.url);
      if(this.onFinished){
        this.onFinished();
      }
    }
  }
  
  var uiProvider = function(tabProvider, aDocument, url){
    this.canvas = aDocument.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    this.canvas.style.width = Measurement.CANVAS_WIDTH + "px";
    this.canvas.style.height = Measurement.CANVAS_HEIGHT + "px";
    this.canvas.width = Measurement.CANVAS_WIDTH;
    this.canvas.height = Measurement.CANVAS_HEIGHT;
    this.tabProvider = tabProvider;
    this.url = url;
  }
  
  uiProvider.prototype = {
    canvas : null,
    tab : null,
    browser: null,
    tabProvider: null,
    url : "",
    coordinator: null,
    Load : function(handler){
      this.coordinator = new canvasLoadCoordinator(30, 5, handler)
      this.coordinator.Start();
      this.tab = this.tabProvider.addTab(this.url);
      this.tab.hidden = true;
      this.browser = this.tabProvider.getBrowserForTab(this.tab);
      this.browser.disablesecurity = true;
      //this.browser.addEventListener("load", handler, true);
      var tmpCoord = this.coordinator;
      this.browser.addProgressListener(new canvasListener(function(){tmpCoord.Loaded();}),
        Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
    },
    FallbackReload : function(){        
        this.coordinator.Reset(); //reset timers
        this.browser.loadURI('chrome://jumpstart/content/iframeWindow.xul?' + this.url);
    },
    GetFallbackContent : function(){
      var content = this.browser.contentWindow;
      var frame = content.document.getElementById('myFrame');
      return {
        //content: content,
        content: frame.contentDocument.defaultView,
        rect: {h: frame.contentDocument.height, w: frame.contentDocument.width}
      };
    },
    
    Stop : function(){
      this.browser.stop();
      this.tabProvider.removeTab(this.tab);
    }
  }
  
  var uiProviderFactory = function(tabProvider, aDocument){
    this.tabProvider = tabProvider;
    this.document = aDocument;
  }
  
  uiProviderFactory.prototype = {
    tabProvider: null,
    document: null,
    Load : function(url){
      return new uiProvider(this.tabProvider, this.document, url);
    }
  }
  
  var STATE_START = Components.interfaces.nsIWebProgressListener.STATE_START;
  var STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;
  var STATE_IS_WINDOW = Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW;
  
  //listener is only used for notifications when window finishes loading (that might happen more then once during page load)
  var canvasListener = function(stopHandler){
    this.handler = stopHandler;
  }
  
  canvasListener.prototype =
  {
    handler: null, //on stop handler - called when finished loading
    QueryInterface: function(aIID)
    {
     if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
         aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
         aIID.equals(Components.interfaces.nsISupports))
       return this;
     throw Components.results.NS_NOINTERFACE;
    },

    onStateChange: function(aWebProgress, aRequest, aFlag, aStatus)
    {
     if(aFlag & STATE_START)
     {
       // This fires when the load event is initiated
     }
     if((aFlag & STATE_STOP) && (aFlag & STATE_IS_WINDOW))
     {
       // This fires when the load finishes
       this.handler();
     }
    },

    onLocationChange: function(aProgress, aRequest, aURI){},
    onProgressChange: function(aWebProgress, aRequest, curSelf, maxSelf, curTot, maxTot) { },
    onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) { },
    onSecurityChange: function(aWebProgress, aRequest, aState) { }
  }
  
  var canvasLoadCoordinator = function(totalTimeout, postLoadTimeout, finished){
    this.totalTimeout = totalTimeout;
    this.postLoadTimeout = postLoadTimeout;
    this.finished = finished;
  }
  
  canvasLoadCoordinator.prototype = {
    totalTimeout : 30, //total timeout for page loading in seconds
    postLoadTimeout : 5, //how much to wait after load has finished for ajax page updates
    finished : null, //handler on finish
    totalTimerId : null, //id of the timer for total timeout
    postLoadTimerId: null, //id of the timer for postLoad timeout
    Start : function(){
      var tmp = this;
      this.totalTimerId = window.setTimeout(function(){tmp.TotalElapsed();}, this.totalTimeout * 1000);
      Logger.debug('Set total timeout', this.totalTimerId, this.totalTimeout);
    },
    ClearPostLoad : function(){
      if(this.postLoadTimerId){
        window.clearTimeout(this.postLoadTimerId);
        Logger.debug('Clear postload timeout', this.postLoadTimerId);
      }
    },
    ClearTotal : function(){
      if(this.totalTimerId){
        window.clearTimeout(this.totalTimerId);
        Logger.debug('Clear total timeout', this.totalTimerId);
      }
    },
    Reset : function(){
      this.ClearPostLoad();
      this.ClearTotal();
      this.Start();
    },
    Loaded: function(){
      this.ClearPostLoad();
      var tmp = this;
      this.postLoadTimerId = window.setTimeout(function(){tmp.LoadedElapsed();}, this.postLoadTimeout * 1000);
      Logger.debug('Set new postload timeout', this.postLoadTimerId, this.postLoadTimeout);
    },
    TotalElapsed : function(){
      Logger.debug('Total Elapsed', this.totalTimerId);
      this.ClearPostLoad();
      this.finished();
    },
    LoadedElapsed : function(){
      Logger.debug('Load Elapsed', this.postLoadTimerId);
      this.ClearTotal();
      this.finished();
    }
  }
  
  ui.GetCanvasLoader = function(url, storageHandler, browserProvider){
    return new PageLoader(url, null, new uiProviderFactory(browserProvider.getBrowser(), document), storageHandler);
  }
  
})();