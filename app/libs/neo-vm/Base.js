let Logger = require(__dirname + "/Logger.js");
let OpCodes = require(__dirname + "/OpCode.js");

class Base {
  constructor() {
    this.opCodes = OpCodes.codes;
  }

  Logging(val) {
    Logger.SetLogging(val);
  }

  Debug() {
    Logger.Log(arguments);
  }

}

module.exports = Base;