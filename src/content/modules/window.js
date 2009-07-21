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

/*
Module: window.js
Exported:
  WindowFunctions - exposes some common window functions and fields so
                    they can be easily used in other modules
*/

let EXPORTED_SYMBOLS = ["WindowFunctions"]; //Symbols exported by Module

let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
let mainWindow = wm.getMostRecentWindow("navigator:browser"); //get the main window - this is how we can get access
                                                              //to the window in module

let WindowFunctions = {
  alert : function(aObject){ mainWindow.alert(aObject); }, //alert function is not available in module but 
                                                           //we can import it in other modules this way
  width : mainWindow.screen.width,
  height : mainWindow.screen.height,
  availWidth: mainWindow.screen.availWidth,
  availHeight: mainWindow.screen.availHeight
}