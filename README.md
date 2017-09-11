# neo-js-compiler
A javascript to bytecode compiler for the neo platform. 
I am well aware that this is not a true compiler in any sense of the word  and that it should probably be called "js-neo-bytecode-converter" but.. I think neo-js-compiler has a nicer ring to it.

__2017-09-11__
* updated repository to include the electron based editor I've been working on to test the javascript conversion in realtime.
* added some test files to samples/ which also includes the expected bytecode from the equivalent c# contract source code.
* compiler now supports arrays (emulating object[] arrays) declaration, assignments and usage as a method argument (note: neos c# compiler doesn't like array initialisation for integers so I'm unable to completely support that at the moment.)
* compiler now supports boolean declarations, assignments and usage as a method argument.