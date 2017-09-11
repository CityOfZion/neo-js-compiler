/**
 * testing array intialisation (emulating c# object[] nnn declaration)
 * note: neo compiler neon.exe doesn't seem to support initialisation of int[] with more than two integers in constructor
 * i.e. 
 * int[] test = new int[2] {1, 2}    works
 * int[] test = new int[3] {1, 2, 3} fails
 *
 * expected c# bytecode:
 * 53 c5 6b 61 55 c5 76 00 04 74 65 73 74 c4 76 51 02 ea 00 c4 76 52 04 61 73 64 66 c4 76 53 01 7b c4 76 54 51 c4 6c 76 6b 00 52 7a c4 6c 76 6b 00 c3 61 65 1e 00 6c 76 6b 51 52 7a c4 6c 76 6b 00 c3 61 65 2d 00 6c 76 6b 52 52 7a c4 61 6c 75 66 52 c5 6b 6c 76 6b 00 52 7a c4 61 51 6c 76 6b 51 52 7a c4 62 03 00 6c 76 6b 51 c3 61 6c 75 66 52 c5 6b 6c 76 6b 00 52 7a c4 61 6c 76 6b 00 c3 6c 76 6b 51 52 7a c4 62 03 00 6c 76 6b 51 c3 61 6c 75 66
 */
function Main() {
  let arrayTest = ["test", 234, "asdf", 123, true];
  let boolTest = testMethod(arrayTest);
  let arrayTest2 = testArrayReturn(arrayTest);
}


function testMethod(paramList) {
  return true;
}

function testArrayReturn(paramList) {
  return paramList;
}