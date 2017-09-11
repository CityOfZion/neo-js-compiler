/**
 * test an empty if/else block with a literal expression for the condition
 *
 * expected c# bytecode:
 * 54 c5 6b 61 51 6c 76 6b 00 52 7a c4 61 61 00 6c 76 6b 51 52 7a c4 62 03 00 51 6c 76 6b 52 52 7a c4 61 61 62 03 00 00 6c 76 6b 53 52 7a c4 62 03 00 61 61 61 6c 75 66
 */
function Main() {
  if (true) {

  }

  if (false) {

  }

  if (true) {

  } else {

  }
  if (false) {

  } else {

  }
}