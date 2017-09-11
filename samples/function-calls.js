/**
 * testing method declarations and variable/argument assignments and usage.
 *
 *
 * expected c# bytecode:
 * 53 c5 6b 61 04 61 61 61 61 6c 76 6b 00 52 7a c4 04 62 62 62 62 6c 76 6b 51 52 7a c4 02 d7 03 6c 76 6b 52 52 7a c4 6c 76 6b 00 c3 61 65 54 00 75 6c 76 6b 00 c3 6c 76 6b 51 c3 61 7c 65 67 00 75 04 63 63 63 63 61 65 3a 00 75 6c 76 6b 00 c3 04 64 64 64 64 61 7c 65 4d 00 75 61 65 72 00 75 61 65 89 00 75 6c 76 6b 52 c3 61 65 9a 00 75 03 ec a8 00 61 65 91 00 75 61 65 af 00 75 61 6c 75 66 52 c5 6b 6c 76 6b 00 52 7a c4 61 6c 76 6b 00 c3 6c 76 6b 51 52 7a c4 62 03 00 6c 76 6b 51 c3 61 6c 75 66 53 c5 6b 6c 76 6b 00 52 7a c4 6c 76 6b 51 52 7a c4 61 6c 76 6b 51 c3 6c 76 6b 52 52 7a c4 62 03 00 6c 76 6b 52 c3 61 6c 75 66 51 c5 6b 61 04 74 65 73 74 6c 76 6b 00 52 7a c4 62 03 00 6c 76 6b 00 c3 61 6c 75 66 51 c5 6b 61 61 65 df ff 6c 76 6b 00 52 7a c4 62 03 00 6c 76 6b 00 c3 61 6c 75 66 52 c5 6b 6c 76 6b 00 52 7a c4 61 6c 76 6b 00 c3 6c 76 6b 51 52 7a c4 62 03 00 6c 76 6b 51 c3 61 6c 75 66 51 c5 6b 61 01 20 6c 76 6b 00 52 7a c4 62 03 00 6c 76 6b 00 c3 61 6c 75 66
 */
function Main() {
  let a = "aaaa";
  let b = "bbbb";
  let c = 983;

  TestReturnStringOne(a);
  TestReturnStringTwo(a, b);
  TestReturnStringOne("cccc");
  TestReturnStringTwo(a, "dddd");
  TestReturnStringThree();
  TestReturnStringFour();
  TestReturnIntOne(c);
  TestReturnIntOne(43244);

  TestReturnIntTwo();


}

function TestReturnStringOne(e) {
  return e;
}

function TestReturnStringTwo(e, f) {
  return f;
}

function TestReturnStringThree() {
  return "test";
}

function TestReturnStringFour() {
  return TestReturnStringThree();
}

function TestReturnIntOne(e) {
  return e;
}

function TestReturnIntTwo() {
  return 32;
}