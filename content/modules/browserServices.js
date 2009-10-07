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


let EXPORTED_SYMBOLS = ["BrowserServices", "JumpstartConfiguration", "Logger"];

Components.utils.import("resource://modules/dbService.js");
Components.utils.import("resource://modules/fileService.js");
Components.utils.import("resource://modules/utils.js");
Components.utils.import("resource://modules/window.js");
Components.utils.import("resource://modules/Preferences.js");
Components.utils.import("resource://modules/Observers.js");

let ProfileDirectory = 'ProfD';
let configChanged = "mlalevic.JumpStart.configChanged";


let BrowserServices = {
  
  getMostVisitedData : function(toGet, toSkip){
    var query = "select m.url, m.title, '', '', m.rev_host, m.id " +
    'FROM moz_places as m ' +
    'INNER JOIN ( ' +
    'select m.rev_host as rev_host, max(m.frecency) as frec from moz_places as m ' +
    "where m.typed = 1 and m.hidden = 0 " + // and m.rev_host <> 'moc.elgoog.liam.' " +
    'group by rev_host ' +
    'order by max(m.frecency) desc ' +
    'limit ' + toGet + ' ' +
    ') as X ON m.rev_host = X.rev_host AND m.frecency = X.frec ';
    //+
    //'LEFT JOIN moz_favicons as icons on m.favicon_id = icons.id';
    
    Logger.debug('Executing query: ', query);
    
    try{    
      return PlacesDb.executeQuery(query, BrowserServices.createMostVisitedItem);
    }catch(e){
      Logger.critical(e.message);
      throw e;
    }
  },
  
  createMostVisitedItem : function(aStatement){
          var size = {};
          var blob = {};
          aStatement.getBlob(2, /*out (uint) */size, /* out (array[size]) */blob);
          var favurl = '';
          if (size.value > 0) {
            favurl = Converter.toDataUrl(blob.value, aStatement.getString(3));
          }
          return ({ url: aStatement.getString(0), title: aStatement.getString(1), fav: favurl, host: aStatement.getString(4), place_id: aStatement.getInt64(5), thumb: '' });
  },
  
  readFileToJson : function(aFileName){
    try{
      var fileService = new FileService(ProfileDirectory, aFileName);
      fileService.CreateIfNotExists();    
      return Converter.fromJSONString(fileService.ReadTextFile());
    }catch(ex){
      WindowFunctions.alert(ex);
    }
  },

  deleteFile: function(aFileName){
    try{
      var fileService = new FileService(ProfileDirectory, aFileName);
      fileService.Delete();
    }catch(ex){
      WindowFunctions.alert(ex);
    }
  },
  
  saveObjectToFile : function(aFileName, aObject){
    try{
      var fileService = new FileService(ProfileDirectory, aFileName);
      fileService.SaveToFile(Converter.toJSONString(aObject));
    }catch(ex){
      WindowFunctions.alert(ex);
    }
  },
  
  calculateMaxThumbs : function(thumbsConfig){
    if(!thumbsConfig){
      thumbsConfig = JumpstartConfiguration.Thumbs;
    }

    let width = WindowFunctions.availWidth;
    let height = WindowFunctions.availHeight;
    let sidebarWidth = 225 + 20; //sidebar + margine - put this to config
    width -= sidebarWidth;
    height -= 150; //for this calculation lets assume this is toolbar and menu size we can add proper calculations later
    
    let thumbWidth = (thumbsConfig.ShowSmallThumbs?100:200) + 15;
    let thumbHeight = (thumbsConfig.ShowSmallThumbs?100:200) + 25;

    
    let columnsCount = Math.floor(width / thumbWidth);
    let linesCount = Math.floor(height / thumbHeight);
    let minColumnCount = thumbsConfig.MinColumns;
    
    linesCount = linesCount < thumbsConfig.MinLines?thumbsConfig.MinLines:linesCount;
    columnsCount = columnsCount < minColumnCount? minColumnCount:columnsCount;
    
    return {columns: columnsCount, lines: linesCount};
  },

  setHistoryComponent : function(hComponent){
      historyComponent = hComponent;
  },
  GetHistoryUtility : function(aWindow){
      return historyComponent.GetHistoryUtility(aWindow);
  },
  setFollowedPage : function(func){
    flwdPg = func;
  },
  FollowedPage : function(aHref){
    flwdPg(aHref);
  },
  setGetClosedDataFunction : function(func){
    getClosedDataFunction = func;
  },
  GetClosedData : function(){
      return getClosedDataFunction();
  },
  setUndoClosedFunction : function(func){
      undoClosedFunction = func;
  },
  UndoClosed: function(anIndex){
      undoClosedFunction(anIndex);
  }
};

var historyComponent = null;
var flwdPg = null;
var getClosedDataFunction = null;
var undoClosedFunction = null;

let LoggerService = function(){
  this.fileService = new FileService(this.folder, this.filename);
  this.logLevel = JumpstartConfiguration.LogLevel;
  Observers.add(Binder.bind(this, this.onConfigChanged), configChanged);
}

LoggerService.prototype = {
  folder : 'TmpD',
  filename : 'jumpstart.log',
  fileService : null,
  logLevel : 3,
  DEBUG : 0,
  INFO : 1,
  WARNING : 2,
  ERROR : 3,
  CRITICAL : 4,
  _slice : Array.prototype.slice,
  log : function(severity, message, additionalArguments){
    //TODO: (ML) log errors and criticals to console too
    if(!this.fileService || this.logLevel > severity)
      return;
    
    this.fileService.AppendToFile((new Date()).toUTCString() + '  ' + severity + ': ' + message + ((additionalArguments && additionalArguments.length > 0)? (': ' + additionalArguments.join(', ') ): '') + '\r\n'); //append log line
  },
  
  debug : function(message){
    this.log(this.DEBUG, message, this._slice.call(arguments, 1));
  },
  
  info : function(message){
    this.log(this.INFO, message, this._slice.call(arguments, 1));
  },
  
  warning : function(message){
    this.log(this.WARNING, message, this._slice.call(arguments, 1));
  },
  
  error : function(message){
    this.log(this.ERROR, message, this._slice.call(arguments, 1));
  },
  
  critical : function(message){
    this.log(this.CRITICAL, message, this._slice.call(arguments, 1));
  },
  
  onConfigChanged : function(){
    this.logLevel = JumpstartConfiguration.LogLevel;
  }
}

let JumpstartPrefs = function(){
  this.prefBranch = new Preferences('mlalevic.jumpstart.');
  this.prefThumbBranch = new Preferences('mlalevic.jumpstart.thumbs.');
  this.prefBranch.addObserver(this);
};

JumpstartPrefs.prototype = {
  prefBranch : null,
  prefThumbBranch : null,
  LoadDelay : 60000,
  RefreshOnStartup : false,
  HookUpNewTab : true,
  OverrideHomepage : true,
  ShowToolbarButton : true,
  PersistThumbViewInHistory : false,
  PurgeHistoryOnThumbViewClose : true,
  ListRefresh : true,
  LogLevel : 3,
  Thumbs : {
    ShowSmallThumbs: false,
    MinCount : 9,
    MinLines : 3,
    get MinColumns(){
      return Math.floor(this.MinCount / this.MinLines);
    },
    get Count(){
        return this.Lines * this.Columns;
    },
    Lines : 3,
    Columns : 3
  },
  
  Refresh : function(){
    this.LogLevel = this.prefBranch.get("LogLevel", this.LogLevel);
    this.LoadDelay = this.prefBranch.get("onstart_load_delay", this.LoadDelay);
    this.RefreshOnStartup = this.prefBranch.get("onstart_refresh", this.RefreshOnStartup);
    this.HookUpNewTab = this.prefBranch.get("hook_up_new_tab", this.HookUpNewTab);
    this.OverrideHomepage = this.prefBranch.get("show_on_startup", this.OverrideHomepage);
    this.ShowToolbarButton = this.prefBranch.get("show_toolbar_button", this.ShowToolbarButton);
    this.ListRefresh = this.prefBranch.get("list_refresh", this.ListRefresh);
    
    this.PersistThumbViewInHistory = this.prefBranch.get("persist_in_history", this.PersistThumbViewInHistory);
    this.PurgeHistoryOnThumbViewClose = this.prefBranch.get("on_tabview_close_purge", this.PurgeHistoryOnThumbViewClose);
    
    this.OverrideHomepage = this.prefBranch.get("show_on_startup", this.OverrideHomepage);
    this.ShowToolbarButton = this.prefBranch.get("show_toolbar_button", this.ShowToolbarButton);
    
    this.Thumbs.Columns = this.prefThumbBranch.get("columns", this.Thumbs.Columns);
    this.Thumbs.Lines = this.prefThumbBranch.get("lines", this.Thumbs.Lines);
    
    this.Thumbs.ShowSmallThumbs = this.prefThumbBranch.get("ShowSmallThumbs", this.Thumbs.ShowSmallThumbs);
  },
  
  observe : function(aSubject, aTopic, data){
    // We're observing preferences only.
    if (aTopic != "nsPref:changed")
      return;
    this.Refresh();
    Observers.notify(null, configChanged, null);
  },
  
  setBranchPref : function(aName, aValue){
    this.prefBranch.set(aName, aValue);
  },
  
  getBranchPref : function(aName){
    return this.prefBranch.get(aName);
  },
  setThumbPref : function(aName, aValue){
    this.prefThumbBranch.set(aName, aValue);
  },
  
  getThumbPref : function(aName){
    return this.prefThumbBranch.get(aName);
  }
};

let JumpstartConfiguration = new JumpstartPrefs();
JumpstartConfiguration.Refresh();

let Logger = new LoggerService();