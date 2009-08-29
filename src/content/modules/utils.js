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


let EXPORTED_SYMBOLS = ["Converter", "Binder", "Namespace"];


let Binder = {
  bindArguments : function(/* object */ o, /* function */ f /*, initial arguments... */){
    var boundArgs = arguments;
    return function() {
        // Build up an array of arguments.  It starts with the previously
        // bound arguments and is extended with the arguments passed now
        var args = [];
        for(var i = 2; i < boundArgs.length; i++) args.push(boundArgs[i]);
        for(var i = 0; i < arguments.length; i++) args.push(arguments[i]);

        // Now invoke the function with these arguments
        return f.apply(o, args);
    }
  },
  
  bind : function(/* object */ o, /* function */ f){
    return function() { return f.apply(o, arguments) }
  }
}


var chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']; //won't be exported

let Converter = {  
  //converts byte to url encoded hex code
  toHexCode : function(aByte){
    if(aByte == undefined || aByte == null || aByte < 0 || aByte > 255){
      return '';
    }
    return ('%' + chars[(aByte - aByte % 16) / 16]) + chars[aByte % 16];
  },
  
  //converts byte array to url encoded string of hex codes
  toHexString : function(aByteArray){
    if(!aByteArray){
      return '';
    }
    
    var result = '';
    for(var i = 0; i < aByteArray.length; i++){
      result += Converter.toHexCode(aByteArray[i]);
    }
    return result;
  },
  
  //convert data to data url
  toDataUrl : function(aByteArray, aMimeType){
    return 'data:' + (aMimeType?(aMimeType + ','): '') + Converter.toHexString(aByteArray);
  },
  
  fromJSONString : function(aBuffer){
    if (aBuffer != '') {
      return Converter._getNativeJSON().decode(aBuffer);
    }
    
    return null;
  },
  
  toJSONString : function(aObject){
      
      return Converter._getNativeJSON().encode(aObject);
  },
  
  _getNativeJSON : function(){
    var Ci = Components.interfaces;
    var Cc = Components.classes;

    return Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
  }
};

let Namespace = {
  modules : {},
  get : function(/* normally the window */ aContainer, name){
      if(name in this.modules){
          return this.modules[name];
      }else{
          return this.create(aContainer, name);
      }
  },
  create : function(/* normally the window */ aContainer, name){
      var parts = name.split('.');
      var container = aContainer;
      for(var i = 0; i < parts.length; i++) {
        var part = parts[i];
        // If there is no property of container with this name, create
        // an empty object.
        if (!container[part]) container[part] = {};
        else if (typeof container[part] != "object") {
            // If there is already a property, make sure it is an object
            var n = parts.slice(0,i).join('.');
            throw new Error(n + " already exists and is not an object");
        }
        container = container[part];
      }
      this.modules[name] = container;
      return container;
  }
}