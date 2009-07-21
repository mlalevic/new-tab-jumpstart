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


let EXPORTED_SYMBOLS = ["FileService"];

Components.utils.import("resource://modules/io.js");

let FileService = function(aFolderName, aFileName){
  var dir = DirIO.get(aFolderName);
  this.File = FileIO.open(dir.path + DirIO.sep + aFileName);
};

FileService.prototype = { 
  _Encoding : "UTF-8", 
  File : null,
  Exists : function(){
    return this.File && this.File.exists();
  },
  ReadTextFile : function(){
    if (this.Exists()) {
        return FileIO.read(this.File, this._Encoding);
     }
     return '';
  },
  
  CreateIfNotExists : function(){
    if(!this.Exists()){
      FileIO.create(this.File);
    }
  },
  
  SaveToFile : function(aData){
    FileIO.write(this.File, aData, '', this._Encoding);
  },
  
  AppendToFile : function(aData){
    this.CreateIfNotExists();
    FileIO.write(this.File, aData, 'a', this._Encoding);
  },
  
  get Path(){
    return this.File?this.File.path:'';
  }
};