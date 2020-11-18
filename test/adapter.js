const ToyPromise = require("../src/toy-promise");

class Adapter extends ToyPromise {
  static deferred() {
    const result = {};
    result.promise = new Adapter((resolve, reject) => {
      result.resolve = resolve;
      result.reject = reject;
    });

    return result;
  }
}

module.exports = Adapter;
