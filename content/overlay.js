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
if(!mlalevic){mlalevic = {};}
if(!mlalevic.JumpStart){mlalevic.JumpStart = {};}

(function(){
    var fennec = false;//typeof(gBrowser) == "undefined";
    var utils = {};
    var services = {}
    Components.utils.import("resource://jumpstart/utils.js", utils);
    Components.utils.import("resource://jumpstart/Observers.js", utils);
    Components.utils.import("resource://jumpstart/config.js", services);
    Components.utils.import("resource://jumpstart/browserServices.js", services);
    Components.utils.import("resource://jumpstart/dbService.js", services);
    Components.utils.import("resource://jumpstart/PrivateBrowsing.js", services);

    //create namespaces
    //var components = utils.Namespace.create(window, "mlalevic.JumpStart.Components");

    var Cc = Components.classes;
    var Ci = Components.interfaces;

    var ver35 = services.BrowserServices.ver35;

    var Config = services.JumpstartConfiguration;


    var dataRefreshEvent = "mlalevic.JumpStart.refresh";
    var bookmarksChangedEvent = "mlalevic.JumpStart.bookmarks";
    var configChanged = "mlalevic.JumpStart.configChanged";
    var tabViewUrl = 'chrome://jumpstart/content/tabView.xul';
    var bookmarksViewUrl = 'chrome://jumpstart/content/bookmarksView.xul';


/***************  Thumb refresh components ********************/
    var ThumbDataHandler = function(dataService, properties){
        this.service = dataService;
        this.properties = properties;
        this.save = function(data){
            this.service.saveThumb(this.properties, data);
        }
    }

    var RefreshComponent = function(dataToRefresh, dataUpdateService, getCanvasLoader){
        this.listToRefresh = dataToRefresh;
        this.service = dataUpdateService;
        this.createLoader = getCanvasLoader;
    }

    RefreshComponent.prototype = {
        listToRefresh : null,
        service : null,
        createLoader : null,
        Start : function(){
            for (var i = 0; i < this.listToRefresh.length; i++) {
                this.createLoader(
                  this.listToRefresh[i].url,
                  new ThumbDataHandler(this.service, this.listToRefresh[i])
                  )
                  .Start();
            }
        }
    }

    var RefreshComponentFactory = function(dataToRefresh){
        var getLoader = function(url, dataHandler){
          return mlalevic.JumpStart.UI.GetCanvasLoader(
              url, dataHandler, browserServices
          );
        }

        return new RefreshComponent(dataToRefresh, new mlalevic.JumpStart.Data.Service(),getLoader);
    }


    /**************************  Thumbs Loader  ******************************/
    var thumbsLoader = {
        start : function(){
            if(Config.RefreshOnStartup){
                window.setTimeout(utils.Binder.bind(this, this.loadThumbnails), Config.LoadDelay);
            }else{
                var model = this.refreshLatest();
                if(model.getLatestCount() < Config.Thumbs.Count){
                    realTimeThumbsUpdates.start();
                }
            }
        },

        refreshLatest : function(){
            var service = new mlalevic.JumpStart.Model.Service(services.BrowserServices, services.AnnoService, Config.Thumbs.Count);
            var model = service.processModel();
            return model;
        },

        loadThumbnails: function() {
          var model = this.refreshLatest();
          var refreshComponent = RefreshComponentFactory(model.getLatest());
          refreshComponent.Start();
          if(model.getLatestCount() < Config.Thumbs.Count){
                realTimeThumbsUpdates.start();
          }
        }
    }
/**************************  Thumbs Loader - End  ******************************/

/***************  Thumb refresh components - End ********************/

/***************  Clear url components ********************/
    var ClearUrlComponentListener = {
        QueryInterface: function(aIID) {
            if (aIID.equals(Ci.nsIWebProgressListener) ||
                aIID.equals(Ci.nsISupportsWeakReference) ||
                aIID.equals(Ci.nsISupports))
              return this;
            throw Components.results.NS_NOINTERFACE;
        },

        onLocationChange: function(aWebProgress, aRequest, aURI) {
            if (aURI.spec == tabViewUrl) {
                gURLBar.value = "";
                gURLBar.focus();
            }
        },
        onStateChange: function (aWebProgress, aRequest, aStateFlags, aStatus) {
            return 0;
        },
        onProgressChange: function() {},
        onStatusChange: function() {},
        onSecurityChange: function() {},
        onLinkIconAvailable: function() {}
    }

    var ClearUrlComponent = {
        start: function() {
            gBrowser.addProgressListener(
                ClearUrlComponentListener,
                Ci.nsIWebProgress.NOTIFY_LOCATION
            );
        },
        stop: function() {
            gBrowser.removeProgressListener(ClearUrlComponentListener);
        }
    }

    //no need to use this
    /*var ClearUrlComponent_fennec = {
        start: function() {
            var tabs = document.getElementById("tabs");
            tabs.addEventListener("TabOpen", function(event){
                let tab = Browser.getTabFromContent(event.originalTarget);
                if(!tab){return;}
                
                let browser = tab.browser;
                if(!browser){return;}

                browser.addProgressListener(
                    ClearUrlComponentListener,
                    Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT
                );
            }, false);
        },
        stop: function() {
            //still have to figure out how to fix this
        }
    }*/
/***************  clear url components - End ********************/

/*************** Snapshot component - refreshes thumb on visit  ***********************/

var makeURI = function (aURL, aOriginCharset, aBaseURI) {
             var ioService = Cc["@mozilla.org/network/io-service;1"]
                                        .getService(Ci.nsIIOService);
             return ioService.newURI(aURL, aOriginCharset, aBaseURI);
    }

    function makeSnapshot(uri, domWindow){
        var result = mlalevic.JumpStart.UI.GetSnapshot(domWindow.document, domWindow);
        if(result){
          services.AnnoService.saveThumb(uri, result);
          services.Logger.debug("Snapshot ", result);
        }else{
          services.Logger.debug("Snapshot result null for ", domWindow.location.toString());
        }
    }

    function doRefresh(aRequest, aWebProgress){
    //check if has anno, if it has, refresh (can be optimized later)
      if(!aRequest){
          return;
      }
      var uri = null;

      if(aRequest.originalURI){
        if(services.AnnoService.hasDetails(aRequest.originalURI)){
            uri = aRequest.originalURI;
        }
      }

      if(uri == null && aRequest.URI){
        if(services.AnnoService.hasDetails(aRequest.URI)){
            uri = aRequest.URI;
        }
      }

      if(uri){
          function afterPaintSnap(e){
                 //services.Logger.critical("rect", e.clientRects);
                 //services.Logger.critical("target", this.document.mlalevic.JumpStart.afterPaintURI.spec);
                 
                 var config = this.document.mlalevic.JumpStart;
                 if(config.counter <= 0)return;

                 var repaintWidth = e.boundingClientRect.width;
                 var repaintHeight = e.boundingClientRect.height;

                 var moreThanHalfScreenRepainted =
                     ((this.screen.availHeight >> 1) < repaintHeight)
                    && ((this.screen.availWidth >> 1) < repaintWidth);

                 if(moreThanHalfScreenRepainted){
                     config.counter -= 1;
                     //services.Logger.debug("rect big enough",  e.boundingClientRect.width + " " + e.boundingClientRect.height);
                     makeSnapshot(config.afterPaintURI, this);
                 }else{
                     //services.Logger.debug("rect too small", e.boundingClientRect.width + " " + e.boundingClientRect.height);
                 }
            }

          function initializeAfterPaint(doc, uri){
              if(!doc.mlalevic || !doc.mlalevic.JumpStart || !doc.mlalevic.JumpStart.afterPaintURI){
                  if(!doc.mlalevic)doc.mlalevic = {};
                  if(!doc.mlalevic.JumpStart)doc.mlalevic.JumpStart = {};
                  doc.mlalevic.JumpStart.afterPaintURI = uri;
                  doc.mlalevic.JumpStart.counter = 10;

                  doc.defaultView.addEventListener("MozAfterPaint", afterPaintSnap, false);
              }
          }

          if(Config.ImprovedRefresh){
            initializeAfterPaint(aWebProgress.DOMWindow.document, uri);
          }

          makeSnapshot(uri, aWebProgress.DOMWindow);
      }
    }

var SnapshotComponentListener = {
        QueryInterface: function(aIID) {
            if (aIID.equals(Ci.nsIWebProgressListener) ||
                aIID.equals(Ci.nsISupportsWeakReference) ||
                aIID.equals(Ci.nsISupports))
              return this;
            throw Components.results.NS_NOINTERFACE;
        },
        onLocationChange: function() {},
        onStateChange: function (aWebProgress, aRequest, aStateFlags, aStatus) {
            // Check if page is finished loading from a network request
            if ((aStateFlags & Ci.nsIWebProgressListener.STATE_STOP))// && (aStateFlags & (Ci.nsIWebProgressListener.STATE_IS_NETWORK | Ci.nsIWebProgressListener.STATE_IS_WINDOW)))
            {
                doRefresh(aRequest, aWebProgress);
            }
            return 0;
        },
        onProgressChange: function() {},
        onStatusChange: function(){},
        onSecurityChange: function() {},
        onLinkIconAvailable: function() {}
    }

var SnapshotComponentListener_AllTabs = {
        QueryInterface: function(aIID) {
            if (aIID.equals(Ci.nsIWebProgressListener) ||
                aIID.equals(Ci.nsISupportsWeakReference) ||
                aIID.equals(Ci.nsISupports))
              return this;
            throw Components.results.NS_NOINTERFACE;
        },
        onLocationChange: function() {},
        onStateChange: function (aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
            // Check if page is finished loading from a network request
            if ((aStateFlags & Ci.nsIWebProgressListener.STATE_STOP))// && (aStateFlags & (Ci.nsIWebProgressListener.STATE_IS_NETWORK | Ci.nsIWebProgressListener.STATE_IS_WINDOW)))
            {
              doRefresh(aRequest, aWebProgress);
            }
            return 0;
        },
        onProgressChange: function() {},
        onStatusChange: function(){},
        onSecurityChange: function() {},
        onLinkIconAvailable: function() {}
    }

var SnapshotComponent = {
        start: function() {
            if(ver35){
                gBrowser.addTabsProgressListener(SnapshotComponentListener_AllTabs);
            }else{
                gBrowser.addProgressListener(
                    SnapshotComponentListener,
                    Ci.nsIWebProgress.NOTIFY_STATE_WINDOW
                );
            }
        },
        stop: function() {
            if(ver35){
                gBrowser.removeTabsProgressListener(SnapshotComponentListener_AllTabs);
            }else{
                gBrowser.removeProgressListener(SnapshotComponentListener);
            }
        }
    }


 var SnapshotComponent_fennec = {
        start: function() {
            /*gBrowser.addProgressListener(
                SnapshotComponentListener,
                Ci.nsIWebProgress.NOTIFY_STATE_WINDOW
            );*/

            var tabs = document.getElementById("tabs");
            tabs.addEventListener("TabOpen", function(event){
                let tab = Browser.getTabFromContent(event.originalTarget);
                if(!tab){return;}

                let browser = tab.browser;
                if(!browser){return;}

                browser.addProgressListener(
                    SnapshotComponentListener,
                    Ci.nsIWebProgress.NOTIFY_STATE_WINDOW
                );
            }, false);
        },
        stop: function() {
            //gBrowser.removeProgressListener(SnapshotComponentListener);
        }
    }

/**************************  New tab loader  ******************************/
    var newTabLoader = {
        start : function(){
            var container = gBrowser.tabContainer;
            if(Config.HookUpNewTab){
                container.addEventListener("TabOpen", utils.Binder.bind(this, this.tabAdded), false);
            }
        },

        tabAdded: function(event) {
            if (event.target.linkedBrowser.userTypedValue === null) {
                event.target.linkedBrowser.loadURI(tabViewUrl);
            }
        }
    }

    var newTabLoader_fennec = {
        start : function(){
            var container = document.getElementById("tabs");

            if(Config.HookUpNewTab){
                container.addEventListener("TabOpen", utils.Binder.bind(this, this.tabAdded), false);
            }
        },

        tabAdded: function(event) {
            let tab = Browser.getTabFromContent(event.originalTarget);
            if(!tab){return;}

            let browser = tab.browser;
            if(!browser){return;}

            if (browser.userTypedValue === null) {
                browser.loadURI(tabViewUrl);
            }
        }
    }

/**************************  New tab loader End  ******************************/

/**************************  Closed state handling ****************************/
   var closedTabState = {
    closedTabsData: [],
    initialized : false,

    start : function() {
      //this.loadClosedData();

      var container = gBrowser.tabContainer;
      container.addEventListener("TabClose", utils.Binder.bind(this, this.tabClosed), false);
      //container.addEventListener("TabSelect", Dial.clearUrlBarForOurTab, false);
    },

    tabClosed: function(event) {
      this.refreshClosed();
    },

    refreshClosed: function(){
      this.loadClosedData();
      utils.Observers.notify(null, dataRefreshEvent, null);
    },

    getClosedData: function(){
      var ss = Cc["@mozilla.org/browser/sessionstore;1"].
         getService(Ci.nsISessionStore);

      if (ss.getClosedTabCount(window) == 0) {
        return [];
      }

      return utils.Converter.fromJSONString(ss.getClosedTabData(window));
    },

    loadClosedData: function() {
      if(!services.PrivateBrowsing.inPrivateBrowsing){
          this.initialized = true;
          this.closedTabsData = this.getClosedData();
      }
    }
  }

/**************************  Closed state handling - End ****************************/

/**************************  Bookmark state handling ********************************/
var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                      .getService(Ci.nsINavBookmarksService);


// An nsINavBookmarkObserver
var bookmarkListener = {
  start : function(){bmsvc.addObserver(bookmarkListener, false);},
  stop : function(){bmsvc.removeObserver(bookmarkListener);},
  notify : function(){utils.Observers.notify(null, bookmarksChangedEvent, null);},
  onBeginUpdateBatch: function() {},
  onEndUpdateBatch: function() { this.notify(); },
  onItemAdded: function(aItemId, aFolder, aIndex) { this.notify(); },
  onItemRemoved: function(aItemId, aFolder, aIndex) { this.notify(); },
  onItemChanged: function(aBookmarkId, aProperty, aIsAnnotationProperty, aValue) {},
  onItemVisited: function(aBookmarkId, aVisitID, time) {},
  onItemMoved: function(aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex) {},
  QueryInterface: function(aIID) {
            if (aIID.equals(Ci.nsINavBookmarkObserver) ||
                aIID.equals(Ci.nsISupports))
              return this;
            throw Components.results.NS_NOINTERFACE;
  }
};

/**************************  Bookmark state handling - End ****************************/

/*************************** Browser service ***********************************/
  var myInnerBrowser = null;

  var browserServices = {
    getInnerBrowser : function(){
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
    },
    getBrowser : function(){
        return this.getInnerBrowser();
    }
  }

  /*************************** Browser service - End ***********************************/

/***************************** History observing **************************************/

var historyObserver = {
    onBeforeDeleteURI : function (){},
    onBeginUpdateBatch : function(){},
    onClearHistory : function(){},
    onDeleteURI : function(){},
    onEndUpdateBatch : function(){},
    onPageChanged : function(){},
    onPageExpired : function(){},
    onTitleChanged : function(){},
    QueryInterface: function(iid) {
        if (iid.equals(Ci.nsINavHistoryObserver) ||
            iid.equals(Ci.nsISupports)) {
                return this;
        }
        throw Cr.NS_ERROR_NO_INTERFACE;
    },
    onVisit : function(){
        var latestCount = this.refreshLatest();
        if(latestCount >= Config.Thumbs.Count){
            realTimeThumbsUpdates.stop();
        }
    },
    refreshLatest : function(){
            var service = new mlalevic.JumpStart.Model.Service(services.HistoryService, services.AnnoService, Config.Thumbs.Count);
            var model = service.updateModel();
            return model;
    }
}

var realTimeThumbsUpdates = {
    start : function(){
        if(Config.ListRefresh){
            var historyService = Cc["@mozilla.org/browser/nav-history-service;1"]
                                   .getService(Ci.nsINavHistoryService);
            historyService.addObserver(historyObserver, false);
        }
    },
    stop : function(){
        var historyService = Cc["@mozilla.org/browser/nav-history-service;1"]
                               .getService(Ci.nsINavHistoryService);
        historyService.removeObserver(historyObserver);
    }
}

/************************* Main Controller ***************************/
  var jumpStartService = {
      start : function() {
        /*if (!mlalevic.JumpStart.Data.App.isInitialised) {
          mlalevic.JumpStart.Data.App.setInitialized();
          window.setTimeout(function() {
            //loaded = false;
            dialService = new Dial.Service(null, DataService);
            dialService.loadData();
          }, 0);
        }
        else {
          //loaded = false;
          dialService = new Dial.Service(null, DataService);
          dialService.hookUpTabEvents();
        }*/
      }
  }

  /************************* Main Controller - End ***************************/

/*************************** Handling UI *********************************/
  var uiService = {
      start : function(){
        var obs = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        obs.addObserver(onBeforeShowObserver, "browser-window-before-show", false);
      }
  }

  var onBeforeShowObserver = {
    observe : function(){
      var obs = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
      obs.removeObserver(onBeforeShowObserver, "browser-window-before-show");

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
/*************************** Handling UI - End *********************************/

/************************* Button Controller ***************************/
  var buttonController = {
    start : function(){
        utils.Observers.add(utils.Binder.bind(this, this.ShowButtonBasedOnConfig), configChanged);
        this.ShowButtonBasedOnConfig();
    },

    ShowButtonBasedOnConfig : function(){
        if(Config.ShowToolbarButton){
            this.ShowButton();
          }else{
            this.HideButton();
          }

        this.ShowStatusBarButton(Config.ShowStatusBarButton);
      },

    ShowStatusBarButton : function(show){
        var bar = document.getElementById("jumpstart_statusbar");
        if(!bar)
          return;
        bar.hidden = !show;
      },

    ShowButton : function(){
        var navBar = document.getElementById("nav-bar");
        if(!navBar)
          return;

        for(var i= 0; i < navBar.childNodes.length; i++){
          if(navBar.childNodes[i].id == "jumpStartOpenDialButton"){
            return;
          }
        }

        navBar.insertItem("jumpStartOpenDialButton", document.getElementById("search-container"), null, false);
        this._persist(navBar);
      },

      HideButton : function(){
        var navBar = document.getElementById("nav-bar");
        if(!navBar)
          return;

        for(var i= 0; i < navBar.childNodes.length; i++){
          if(navBar.childNodes[i].id == "jumpStartOpenDialButton"){
            navBar.removeChild(navBar.childNodes[i]);
            this._persist(navBar);
            return;
          }
        }
      },
      _persist : function(toolbar){
        var currentSet = toolbar.currentSet;
        toolbar.setAttribute("currentset", currentSet);
        document.persist(toolbar.id, "currentset");
      }
  }
/************************* Button Controller - End ***************************/

/************************* History Controller ***************************/
  var historyComponent = {
     start : function(){
         window.addEventListener("SSTabClosing", utils.Binder.bind(this, this.ssClosing), false);
     },
     GetHistoryUtilityForBrowser : function(aBrowser){
        var internalHistory = aBrowser.sessionHistory.QueryInterface(Ci.nsISHistoryInternal);
        return new mlalevic.Utils.HistoryUtility(internalHistory);
     },
    ssClosing : function(e){
        //TODO: (ML) reduce nesting
        try{
          if(e && e.originalTarget && e.originalTarget.linkedBrowser && e.originalTarget.linkedBrowser.currentURI){
            var bro = e.originalTarget.linkedBrowser;
            if(bro.currentURI.spec == tabViewUrl || bro.currentURI.spec == bookmarksViewUrl){
              var historyUtility = this.GetHistoryUtilityForBrowser(bro);
              //if the last opened page was tabView then depending on the configuration purge history
              //if there is only one item then purge all too
              if(Config.PurgeHistoryOnThumbViewClose || historyUtility.Count == 1){
                historyUtility.PurgeAll();
                //HACK: (ML) this can change in new ffox versions + investigate further to see if this is going to affect us adversly
                //prepare data to fool Components/nsSessionStore.js, _collectTabData function
                bro.parentNode.__SS_data = {entries : []};
                bro.parentNode.__SS_data._tab = true;
                bro.parentNode.__SS_data._tabStillLoading = true; //FF3.5 hack

                //FF3.6 hack
                bro.__SS_data = {entries : [], _tab: true, _tabStillLoading: true};
                //ENDHACK
              }else{
                historyUtility.RemoveCurrent(); //we are removing current since current one is loaded in browser (not necesserally the last one)
                if(bro.parentNode.__SS_data){
                    delete bro.parentNode.__SS_data; //HACK: (ML) this can change in new versions of ffox
                }

                if(bro.__SS_data){
                    delete bro.__SS_data; //HACK: (ML) this is for FF3.6
                }
              }
            }
          }
        }catch(ex){
          services.Logger.error("Error in fixing history for closing tab", ex.message);
        }
      },
      GetHistoryUtility : function(aWindow){
        var bro = getBrowserFromContentWindow(aWindow);
        return this.GetHistoryUtilityForBrowser(bro);
      }
  }
/************************* History Controller - End ***************************/

var onInstall = {
    start : function(){
        var ver = '', version = '0.5a5.4.3';

        var svc = Cc["@mozilla.org/preferences-service;1"]
                   .getService(Ci.nsIPrefService);
        var prefs = svc.getBranch("mlalevic.jumpstart.");
        var thumb = svc.getBranch("mlalevic.jumpstart.thumbs.");

        try{
            ver = prefs.getCharPref("version");
        }catch(e){
          //nothing
        }

        prefs.setCharPref("version", version);
        if (!ver){ //first run
            return; //nothing for now
        }

        if (ver != version){

          function clear(branch, values){
            for(var i = 0; i < values.length; i++){
                try{
                    if(branch.getPrefType(values[i])){ //not 0 - 0 means does not exist
                      if(branch.prefHasUserValue(values[i])){ //clear only if it has user set value (otherwise throws exception)
                           branch.clearUserPref(values[i]);
                      }
                    }
                }catch(ex){}
            }
          }

          function removeFiles(files){
            for(var i = 0; i < files.length; i++){
                try{
                  services.BrowserServices.deleteFile(files[i]);
                }catch(ex){}
            }
          }

          if(version == '0.5a5.4'){
              //only for version 0.5a5.4
              //upgrade toolbar config
              var toptoolbar = prefs.getBoolPref("bookmarks_toolbar_top", false);
              var toolbarshown = prefs.getBoolPref("show_bookmarks_toolbar", false);

              if(toolbarshown){
                  if(toptoolbar){
                    prefs.setCharPref("top_toolbars", "place:folder=TOOLBAR");
                  }else{
                    prefs.setCharPref("bottom_toolbars", "place:folder=TOOLBAR");
                  }
              }
          }



          //if(!ver){ //uncomment this only for small updates (when previous notice has been retained)
          clear(prefs, ['show_notice']); //show notice on upgrade
          //}
          // Insert code if version is different here => upgrade
          if(!ver){
              //clear prefs///////////////////////////////
              clear(prefs, ['onstart_refresh', 'LogLevel']);
              clear(thumb, [
                  'ContainerWidth', 'ContainerHeight',
                  'DefaultContainerWidth', 'DefaultContainerHeight',
                  'LargeWidth', 'LargeHeight', 'SmallWidth', 'DefaultSmallWidth',
                  'SmallHeight', 'DefaultSmallHeight', 'NormalWidth', 'NormalHeight',
                  'DefaultWidth', 'DefaultHeight', 'count'
              ]);
              //update prefs - this should probably be the same as clear prefs//////////////////////////////

              //remove files//////////////////////////////
              removeFiles(['jumpstart.cache', 'jumpstart.pinned', 'jumpstart.removed', 'jumpstart.alter']);
          }
        }
    }
}

/********** Event handlers ***********/
mlalevic.JumpStart.onDialOpen = function(){
      gBrowser.selectedBrowser.loadURI(tabViewUrl);
  }


mlalevic.JumpStart.onMenuItemProperties = function(e){
      var strbundle = document.getElementById("jumpstart-strings");
      window.openDialog("chrome://jumpstart/content/preferences/preferences.xul", strbundle.getString("properties_title"),
        "chrome,toolbar,centerscreen").focus();
}
/*********  Event handlers end *******/

mlalevic.JumpStart.UndoClosed = function(aValue) {
    /*if (aEvent.button != 1) //left button
      return;*/

    undoCloseTab(aValue);
    closedTabState.refreshClosed();
}

mlalevic.JumpStart.getClosedData = function(){
    if(services.PrivateBrowsing.inPrivateBrowsing){
        return closedTabState.getClosedData();
    }else{
        if(!closedTabState.initialized){
            closedTabState.loadClosedData()
        }
        return closedTabState.closedTabsData;
    }
}

var startAll = function(){
        window.removeEventListener("load", startAll, false);


        if(fennec){
            newTabLoader_fennec.start();
            SnapshotComponent_fennec.start();
        }else{
            ClearUrlComponent.start();
            newTabLoader.start();
            SnapshotComponent.start();
            closedTabState.start();
        }

        if(!services.BrowserServices.initialized){
            thumbsLoader.start();
        }
        historyComponent.start();

        buttonController.start();
        jumpStartService.start();
        bookmarkListener.start();

        services.BrowserServices.initialized = true;

        //in both cases we will invalidate initialized status so we refresh closed data on the first new refresh
        services.PrivateBrowsing.watcher = {
          onEnterPrivateBrowsing : function() {
            closedTabState.initialized = false;
          },

          onExitPrivateBrowsing : function() {
            closedTabState.initialized = false;
          }
        };
}

uiService.start();
window.addEventListener("load", startAll, false);
if(!fennec){
    window.setTimeout(onInstall.start, 0);
}
})();