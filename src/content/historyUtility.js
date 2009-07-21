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

  (function() {
    var utils = mlalevic.Utils;

    utils.HistoryUtility = function(sessionHistory) {
      if (!sessionHistory)
        throw new Error("Session history must not be null!");
      this._historyService = sessionHistory;
    }

    utils.HistoryUtility.prototype = {
      _historyService: null,
      //gets transaction from specified index
      _getTransaction: function(index) {
        if (!this._historyService.rootTransaction) //if the root transaction not defined return null - _historyService cannot be null (exception would be thrown in constructor)
          return null;
        if (index < 0 || this._historyService.count <= index) //if index is out of bounds return null
          return null;

        var count = 0;
        var current = this._historyService.rootTransaction; //set the zero-th index to be rootTransaction
        while (count < index) { //traverse the list until index is reached
          count++;
          current = current.next;
          if (!current)
            return null;
        }
        return current;
      },
      _getInternalCount: function() { //this is mostly for testing purposes
        var count = 0;
        var current = this._historyService.rootTransaction;
        while (current) {
          count++;
          current = current.next;
        }
        return count;
      },
      SetPersist: function(index, value) { //sets persist flag of a transaction at the given index to a given value
        var found = this._getTransaction(index);
        if (found)
          found.persist = value;
      },
      
      SetCurrentPersist: function(value){
        this.SetPersist(this._historyService.index, value);
      },
      //removes items from history - starting with given index and removes given count of entries
      Remove: function(index, count) {
        if (index < 0 || index >= this._historyService.count) //check bounds
          return;

        if (index + count > this._historyService.count) { //change count number if required
          count = this._historyService.count - index;
        }

        if (count < 1) //if count is less then 1 nothing to remove (0 or less then 0)
          return;

        if (index == 0) {
          this._historyService.PurgeHistory(count); //if 0 then we should just purge with count
          return;
        }

        var sourceIndex = index - 1; //source index
        var destinationIndex = index + count - 1; //destination index
        var current = this._getTransaction(sourceIndex);
        while (current && sourceIndex >= 0) {
          this._historyService.replaceEntry(destinationIndex, current.sHEntry); //
          sourceIndex--;
          destinationIndex--;
          current = current.prev;
        }

        this._historyService.PurgeHistory(count);
      },
      //purges all values
      PurgeAll: function() {
        this._historyService.PurgeHistory(this._historyService.count);
      },
      RemoveCurrent : function(){ //removes the current history entry
        this.Remove(this._historyService.index, 1);
      },
      
      get Count(){
        return this._historyService.count;
      }
    }

  } ());