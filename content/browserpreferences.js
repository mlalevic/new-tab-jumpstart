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
Copyright (C) 2010, Mihailo Lalevic. All Rights Reserved.

Contributor(s):
**** END LICENSE BLOCK **** */

window.addEventListener("load", function(){
    var strbundle = document.getElementById("jumpstart-strings");
    var useCurrentButton = document.getElementById('useCurrent');
    var container = useCurrentButton.parentNode;
    var myButton = document.createElement('button');
    myButton.setAttribute('label', strbundle.getString('use_jumpstart'));
    myButton.setAttribute('accesskey', strbundle.getString('use_jumpstart_accelerator_key'));
    myButton.addEventListener('command', function(){document.getElementById("browser.startup.homepage").value='chrome://jumpstart/content/tabView.xul';}, true);
    container.insertBefore(myButton, useCurrentButton);
}, false);