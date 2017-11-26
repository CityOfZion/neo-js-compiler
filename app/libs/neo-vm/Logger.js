module.exports = {
  logging: true,
  SetLogging: function (val) {
    this.logging = val;
  },
  Log: function () {
    if (!this.logging) {
      return;
    }
    console.log.apply(this, [].slice.call(arguments[0]));
  }
};