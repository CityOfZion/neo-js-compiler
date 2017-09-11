/**
 * testing the assignment of variables (arrays and bools) after they have been declared
 *
 * expected c# bytecode:
 * 53 c5 6b 61 00 6c 76 6b 00 52 7a c4 52 c5 6c 76 6b 51 52 7a c4 00 6c 76 6b 52 52 7a c4 6c 76 6b 51 c3 51 02 d2 04 c4 6c 76 6b 51 c3 00 04 61 73 64 66 c4 04 66 64 73 61 6c 76 6b 52 52 7a c4 51 6c 76 6b 00 52 7a c4 61 6c 75 66
 */
function Main() {
  let atest = false;
  let arrayTest = [];
  let btest = "";
  arrayTest[1] = 1234;
  arrayTest[0] = "asdf";
  btest = "fdsa";
  atest = true;
}
