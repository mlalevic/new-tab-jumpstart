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
    var fennec = typeof(gBrowser) == "undefined";
    var utils = {};
    var services = {}
    Components.utils.import("resource://modules/utils.js", utils);
    Components.utils.import("resource://modules/Observers.js", utils);
    Components.utils.import("resource://modules/config.js", services);
    Components.utils.import("resource://modules/browserServices.js", services);
    Components.utils.import("resource://modules/dbService.js", services);

    //create namespaces
    //var components = utils.Namespace.create(window, "mlalevic.JumpStart.Components");

    var Cc = Components.classes;
    var Ci = Components.interfaces;

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
                  //check if has anno, if it has, refresh (can be optimized later)
              if(!aRequest){
                  return 0;
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
                  var result = mlalevic.JumpStart.UI.GetSnapshot(aWebProgress.DOMWindow.document, aWebProgress.DOMWindow);
                  if(result){
                    services.AnnoService.saveThumb(uri, result);
                    services.Logger.debug("Snapshot: ", result);
                  }else{
                      services.Logger.debug("Snapshot: result null for ", aWebProgress.DOMWindow.location.toString());
                  }
              }
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
            gBrowser.addProgressListener(
                SnapshotComponentListener,
                Ci.nsIWebProgress.NOTIFY_STATE_WINDOW
            );
        },
        stop: function() {
            gBrowser.removeProgressListener(SnapshotComponentListener);
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

    loadClosedData: function() {
      this.initialized = true;
      var ss = Cc["@mozilla.org/browser/sessionstore;1"].
           getService(Ci.nsISessionStore);

      if (ss.getClosedTabCount(window) == 0) {
        this.closedTabsData = [];
        return;
      }

      // populate data
      this.closedTabsData = utils.Converter.fromJSONString(ss.getClosedTabData(window));
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
      },
      onMenuItemProperties : function(e){
          var strbundle = document.getElementById("jumpstart-strings");
          window.openDialog("chrome://jumpstart/content/preferences/preferences.xul", strbundle.getString("properties_title"),
          "chrome,toolbar,centerscreen").focus();
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
      },

      HideButton : function(){
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
  }
/************************* Button Controller - End ***************************/

/************************* History Controller ***************************/
  var historyComponent = {
     start : function(){
         window.addEventListener("SSTabClosing", utils.Binder.bind(this, this.ssClosing), false);
         services.BrowserServices.setHistoryComponent(historyComponent);
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
                bro.parentNode.__SS_data = {entries : []};
                bro.parentNode.__SS_data._tab = true;
                bro.parentNode.__SS_data._tabStillLoading = true; //FF3.5 hack
                //ENDHACK
              }else{
                historyUtility.RemoveCurrent(); //we are removing current since current one is loaded in browser (not necesserally the last one)
                delete bro.parentNode.__SS_data; //HACK: (ML) this can change in new versions of ffox
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
        var ver = -1, firstrun = true;

        var extension = Application.extensions.get("jumpstart@mihailo.lalevic");
        if(!extension){
            return;
        }

        var svc = Cc["@mozilla.org/preferences-service;1"]
                   .getService(Ci.nsIPrefService);
        var prefs = svc.getBranch("mlalevic.jumpstart.");
        var thumb = svc.getBranch("mlalevic.jumpstart.thumbs.");

        try{
            ver = prefs.getCharPref("version");
        }catch(e){
          //nothing
        }

        if (extension.firstRun){
            prefs.setCharPref("version",extension.version);
            return; //nothing for now
        }

        if (ver!=extension.version){

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

          prefs.setCharPref("version",extension.version);
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
/*********  Event handlers end *******/

var UndoClosed = function(aValue) {
    /*if (aEvent.button != 1) //left button
      return;*/

    undoCloseTab(aValue);
    closedTabState.refreshClosed();
}

var startAll = function(){
        window.removeEventListener("load", startAll, false);

        if(fennec){
            newTabLoader_fennec.start();
            SnapshotComponent_fennec.start();
            services.BrowserServices.setGetClosedDataFunction(function(){
                return [];
            });
        }else{
            ClearUrlComponent.start();
            newTabLoader.start();
            SnapshotComponent.start();
            if(!services.BrowserServices.initialized){
                closedTabState.start();
                services.BrowserServices.setGetClosedDataFunction(function(){
                    if(!closedTabState.initialized){
                        closedTabState.loadClosedData()
                    }
                    return closedTabState.closedTabsData;
                });
            }
        }

        if(!services.BrowserServices.initialized){
            thumbsLoader.start();
            historyComponent.start();
        }

        buttonController.start();
        jumpStartService.start();
        bookmarkListener.start();

        if(!services.BrowserServices.initialized){
            services.BrowserServices.setFollowedPage(function(url){PlacesUIUtils.markPageAsTyped(url);});
            services.BrowserServices.setUndoClosedFunction(UndoClosed);
        }
        services.BrowserServices.initialized = true;
}

uiService.start();
window.addEventListener("load", startAll, false);
if(!fennec){
    window.setTimeout(onInstall.start, 0);
}
})();


/*
(function() {
  
  
  Dial.registerForUpdate = function(aFunc){
    Utils.Observers.add(aFunc, dataRefreshEvent);
  }
  
  Dial.unRegisterForUpdate = function(aFunc){
    Utils.Observers.remove(aFunc, dataRefreshEvent);
  }
  
 
} ());  */