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

Components.utils.import("resource://modules/Observers.js", mlalevic.Utils);
Components.utils.import("resource://modules/utils.js", mlalevic.Utils);

if (!mlalevic.ChromeDial) {
    mlalevic.ChromeDial = {};
  }

  if (!mlalevic.JumpStart) {
    mlalevic.JumpStart = {};
  }

  if (!mlalevic.JumpStart.Data) {
    mlalevic.JumpStart.Data = {};
  }
  
  
if (!mlalevic.JumpStart.Services) {
    mlalevic.JumpStart.Services = {};
  }
Components.utils.import("resource://modules/browserServices.js", mlalevic.JumpStart.Services);

//mlalevic.JumpStart
(function() {

  var dataRefreshEvent = "mlalevic.JumpStart.refresh";
  var configChanged = "mlalevic.JumpStart.configChanged";
  var tabViewUrl = 'chrome://jumpstart/content/tabView.xul';
  
  /*var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
                               .getService(Components.interfaces.nsIBrowserHistory);
  // the IO service
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);

  // create an nsIURI
  var uri = ioService.newURI(tabViewUrl, null, null);

  historyService.hidePage(uri);*/
  
  
  //var preloadedData = [];
  var Data = mlalevic.JumpStart.Data;
  var DataService = mlalevic.JumpStart.Services.DataService;
  var Config = mlalevic.JumpStart.Services.JumpstartConfiguration;

  var Utils = mlalevic.Utils;
  var Dial = mlalevic.ChromeDial;

  Dial.Service = function(loadedCallback, dataService) {
    this.loadedCallback = loadedCallback;
    this._service = dataService;
  }

  Dial.Service.prototype = {
    _service : null,
    _thumbCount : Config.Thumbs.Count,
    loadedCallback: null,
    loadedCount: 0,
    //thumbData: [], //TODO: (ML) use data service _service._mostFrequentData //change this with something better managable
    //currentData: [], //TODO: (ML) use data service
    bookmarkData: [],
    closedTabsData: [],
    /*loadMostUsedData: function() {
      this.thumbData = this._service.getMostFrequentData();
    },*/

    hookUpTabEvents: function() {
      var container = gBrowser.tabContainer;
      if(Config.HookUpNewTab){
        container.addEventListener("TabOpen", Utils.Binder.bind(this, this.tabAdded), false);
      }
      container.addEventListener("TabClose", Utils.Binder.bind(this, this.tabClosed), false);
      container.addEventListener("TabSelect", Dial.clearUrlBarForOurTab, false);
    },

    tabAdded: function(event) {
      if (event.target.linkedBrowser.userTypedValue === null) {
        event.target.linkedBrowser.loadURI(tabViewUrl);
        /*var internalHistory = event.target.linkedBrowser.sessionHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);
        internalHistory.rootTransaction.persist = false;*/
      }
    },

    tabClosed: function(event) {
      this.refreshClosed();
    },
    
    refreshClosed: function(){
      this.loadClosedData();
      Utils.Observers.notify(null, dataRefreshEvent, null);
    },

    loadClosedData: function() {
      var ss = Cc["@mozilla.org/browser/sessionstore;1"].
           getService(Ci.nsISessionStore);

      if (ss.getClosedTabCount(window) == 0) {
        this.closedTabsData = [];
        return;
      }

      // populate data
      this.closedTabsData = eval("(" + ss.getClosedTabData(window) + ")");
    },

    loadData: function() {
      //this.loadMostUsedData();
      this.loadClosedData();
      this.hookUpTabEvents();
      if (this._service.HasCachedData) {
        window.setTimeout(Utils.Binder.bind(this, this.loadThumbnails), Config.LoadDelay);
      } else {
        this.loadThumbnails();
      }
    },

    loadThumbnails: function() {
      this.loadedCount = 0;
      for (var i = 0; i < this._service._mostFrequentData.length; i++) {
        //var handler = Utils.Binder.bindArguments(this._service, this._service.updateThumbData, i);
        function dataHandler(dataService, index, properties){
            this.service = dataService;
            this.index = index;
            this.properties = properties;
            this.save = function(data){
                this.service.updateThumbData(this.index, data);
                var ds = new mlalevic.JumpStart.Data.Service();
                ds.saveThumb(this.properties, data);
            }
        }
        var index = i;
        var service = this._service;
        mlalevic.Utils.UI.GetCanvasLoader(
          this._service._mostFrequentData[index].url, 
          //{save: function(data){service.updateThumbData(index, data);}},
          new dataHandler(service, index, this._service._mostFrequentData[index]),
          Dial
          )
          .Start();
        //var c = new RemoteCanvas(this._service._mostFrequentData[i].url, Utils.Binder.bindArguments(this._service, this._service.updateThumbData, i));
        //c.load();
      }
    },
    
    get currentData(){
      return this._service._mostFrequentData;
    }
  }

  var dialService = null;
  var loaded = false;
  var myInnerBrowser = null;
  
  function getInnerBrowser(){
    if(!myInnerBrowser){
      //dynamically insert browser
      var abox = document.getElementById('jumpstartHiddenBox');
      myInnerBrowser = document.createElement('tabbrowser');
      myInnerBrowser.setAttribute('id', 'jumpstartHiddenContent');
      myInnerBrowser.setAttribute('disablehistory', 'true');
      myInnerBrowser.setAttribute('hidden', 'false');
      abox.appendChild(myInnerBrowser);

      //myInnerBrowser = document.getElementById('jumpstartHiddenContent');
    }
    
    return myInnerBrowser;
  }
  
  Dial.getBrowser =function(){
    return getInnerBrowser();
  }

  Dial.load = function() {
    window.removeEventListener("load", mlalevic.ChromeDial.load, false);
    //myInnerBrowser = document.getElementById('jumpstartHiddenContent');
    //alert(myInnerBrowser);
    Utils.Observers.add(Dial.ConfigChanged, configChanged);
    
    Dial.ShowButtonBasedOnConfig();

    if (!Data.IsInitialised) {
      Data.IsInitialised = true;
      //alert('loading');
      window.setTimeout(function() {
        loaded = false;
        dialService = new Dial.Service(null, DataService);
        //dialService.currentData = Data.CurrentData;
        dialService.loadData();
      }, 0);
    }
    else {
      loaded = false;
      dialService = new Dial.Service(null, DataService);
      //dialService.currentData = Data.CurrentData;
      dialService.hookUpTabEvents();
    } //window.setTimeout(Dial.draw, 10000);
  }

  Dial.getData = function() {
    return dialService.currentData;
  }
  
  Dial.getDataService = function(){
    return DataService;
  }
  
  Dial.registerForUpdate = function(aFunc){
    Utils.Observers.add(aFunc, dataRefreshEvent);
  }
  
  Dial.unRegisterForUpdate = function(aFunc){
    Utils.Observers.remove(aFunc, dataRefreshEvent);
  }

  Dial.getClosedData = function() {
    return dialService.closedTabsData;
  }
  
  Dial.UndoClose = function(aValue, aEvent) {
    if (aEvent.button != 0) //1) //left button
      return;

    undoCloseTab(aValue);
    getBrowser().moveTabToEnd();
    dialService.refreshClosed();
  }
  
  Dial.clearUrlBar = function(){
    if (gURLBar && gURLBar.value == tabViewUrl) { 
      gURLBar.value = ""; 
      gURLBar.focus();
    }
  }

  Dial.clearUrlBarForOurTab = function() {
    window.setTimeout(Dial.clearUrlBar, 0);
  }
  
  /*Dial.clearUrlBar = function(){
  }*/
  
  Dial.followedPage = function(url){
    PlacesUIUtils.markPageAsTyped(url);
  }
  
  Dial.onMenuItemProperties = function(e){
      var strbundle = document.getElementById("jumpstart-strings");
    window.openDialog("chrome://jumpstart/content/preferences/preferences.xul", strbundle.getString("properties_title"),
    "chrome,toolbar,centerscreen").focus();
  }
  
  Dial.onBeforeShowObserver = {
    observe : function(){
      var obs = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      obs.removeObserver(mlalevic.ChromeDial.onBeforeShowObserver, "browser-window-before-show");

      if(Config.OverrideHomepage){ //if we are showing our page on startup then load if there is only one tab and it is blank or hompage
        if(gBrowser && gBrowser.tabContainer.itemCount == 1){
          if('arguments' in window && window.arguments[0]){
            let homepage = null;
            try{
              //load homepage from preferences
              let prefs = Cc["@mozilla.org/preferences-service;1"]
               .getService(Ci.nsIPrefService).getDefaultBranch(null);
              homepage = prefs.getComplexValue("browser.startup.homepage",
                                  Ci.nsIPrefLocalizedString).data; 
            }catch(e){}

            if(window.arguments[0] == "about:blank" || (homepage && window.arguments[0] == homepage)){
              //if blank or homepage load tabview
              window.setTimeout( function(){gBrowser.selectedBrowser.loadURI(tabViewUrl);}, 0); 
            }
          }
        }
      }
    }
  }
  
  Dial.onDialOpen = function(){
      gBrowser.selectedBrowser.loadURI(tabViewUrl);
  }
  
  Dial.ConfigChanged = function(){
      Dial.ShowButtonBasedOnConfig();
  }
  
  Dial.ShowButtonBasedOnConfig = function(){
    if(Config.ShowToolbarButton){
        Dial.ShowButton();
      }else{
        Dial.HideButton();
      }
  }
  
  Dial.ShowButton = function(){
    var navBar = document.getElementById("nav-bar");
    if(!navBar)
      return;
    
    for(var i= 0; i < navBar.childNodes.length; i++){
      if(navBar.childNodes[i].id == "jumpStartOpenDialButton"){
        return;
      }
    }
    
    navBar.insertItem("jumpStartOpenDialButton", document.getElementById("search-container"), null, false);
  }
  
  Dial.HideButton = function(){
    var navBar = document.getElementById("nav-bar");
    if(!navBar)
      return;
    
    for(var i= 0; i < navBar.childNodes.length; i++){
      if(navBar.childNodes[i].id == "jumpStartOpenDialButton"){
        navBar.removeChild(navBar.childNodes[i]);
        return;
      }
    }
  }
  
  function GetHistoryUtilityForBrowser(aBrowser){
    var internalHistory = aBrowser.sessionHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);
    return new Utils.HistoryUtility(internalHistory);
  }
  
  Dial.ssClosing = function(e){
    //TODO: (ML) reduce nesting
    try{
      if(e && e.originalTarget && e.originalTarget.linkedBrowser && e.originalTarget.linkedBrowser.currentURI){
        var bro = e.originalTarget.linkedBrowser;
        if(bro.currentURI.spec == tabViewUrl){
          var historyUtility = GetHistoryUtilityForBrowser(bro);
          //if the last opened page was tabView then depending on the configuration purge history
          //if there is only one item then purge all too
          if(Config.PurgeHistoryOnThumbViewClose || historyUtility.Count == 1){
            historyUtility.PurgeAll();
            //HACK: (ML) this can change in new ffox versions + investigate further to see if this is going to affect us adversly
            bro.parentNode.__SS_data = {entries : []};
            bro.parentNode.__SS_data.entries.push({url: "about:blank"});
            bro.parentNode.__SS_data._tab = true;
            //ENDHACK
          }else{
            historyUtility.RemoveCurrent(); //we are removing current since current one is loaded in browser (not necesserally the last one)
            delete bro.parentNode.__SS_data; //HACK: (ML) this can change in new versions of ffox
          }
        }
      }
    }catch(ex){
      mlalevic.JumpStart.Services.Logger.error("Error in fixing history for closing tab", ex.message);
    }
  }
  
  Dial.GetHistoryUtility = function(aWindow){
    var bro = getBrowserFromContentWindow(aWindow);
    return GetHistoryUtilityForBrowser(bro);
  }
  
  Dial.GetBrowser = function(aWindow){
    return getBrowserFromContentWindow(aWindow);
  }
  
} ());

window.addEventListener("load", mlalevic.ChromeDial.load, false);
window.addEventListener("SSTabClosing", mlalevic.ChromeDial.ssClosing, false);

var obs = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
obs.addObserver(mlalevic.ChromeDial.onBeforeShowObserver, "browser-window-before-show", false);