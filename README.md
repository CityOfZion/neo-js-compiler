<p align="center">
  <img 
    src="http://res.cloudinary.com/vidsy/image/upload/v1503160820/CoZ_Icon_DARKBLUE_200x178px_oq0gxm.png" 
    width="125px"
  >
</p>

<h1 align="center">neo-js-compiler</h1>

# Description
A javascript to bytecode compiler for the neo platform. 
I am well aware that this is not a true compiler in any sense of the word  and that it should probably be called "js-neo-bytecode-converter" but.. I think neo-js-compiler has a nicer ring to it.

# Installation
* `git clone`
* `npm install` install npm modules
* `npm start` run!

__2017-09-11 Update__
* updated repository to include the electron based editor I've been working on to test the javascript conversion in realtime.
* added some test files to samples/ which also includes the expected bytecode from the equivalent c# contract source code.
* compiler now supports arrays (emulating object[] arrays) declaration, assignments and usage as a method argument (note: neos c# compiler doesn't like array initialisation for integers so I'm unable to completely support that at the moment.)
* compiler now supports boolean declarations, assignments and usage as a method argument.
* added preliminary support for literal, empty if/else conditionals (this will likely be refactored as further conditional operators are supported)
