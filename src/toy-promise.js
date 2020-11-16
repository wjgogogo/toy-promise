const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class ToyPromise {
  constructor(executor) {
    this._status = PENDING;

    this._value = undefined;
    this._fulfilledQueue = [];

    this._reason = undefined;
    this._rejectedQueue = [];

    try {
      executor(this._resolve, this._reject);
    } catch (e) {
      this._reject(e);
    }
  }

  _resolve = (value) => {
    if (this._status === PENDING) {
      this._status = FULFILLED;
      this._value = value;
      this._fulfilledQueue.forEach((cb) => cb(value));
    }
  };

  _reject = (reason) => {
    if (this._status === PENDING) {
      this._status = REJECTED;
      this._reason = reason;
      this._rejectedQueue.forEach((cb) => cb(reason));
    }
  };

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : (value) => value;

    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise = new ToyPromise((resolve, reject) => {
      if (this._status === PENDING) {
        this._fulfilledQueue.push((value) => {
          setTimeout(() => {
            try {
              const x = onFulfilled(value);
              resolveToyPromise(promise, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
        this._rejectedQueue.push((reason) => {
          setTimeout(() => {
            try {
              const x = onRejected(reason);
              resolveToyPromise(promise, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
      } else if (this._status === FULFILLED) {
        setTimeout(() => {
          try {
            const x = onFulfilled(this._value);
            resolveToyPromise(promise, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      } else {
        setTimeout(() => {
          try {
            const x = onRejected(this._reason);
            resolveToyPromise(promise, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      }
    });

    return promise;
  }
}

function resolveToyPromise(promise, x, resolve, reject) {
  if (promise === x) {
    throw TypeError("Chaining cycle detected for toy promise");
  }
  let called = false;

  if ((typeof x === "object" && x !== null) || typeof x === "function") {
    try {
      let then = x.then;
      if (typeof then === "function") {
        then.call(
          x,
          (value) => {
            if (called) {
              return;
            }
            called = true;
            resolveToyPromise(promise, value, resolve, reject);
          },
          (reason) => {
            if (called) {
              return;
            }
            called = true;
            reject(reason);
          }
        );
      } else {
        if (called) {
          return;
        }
        called = true;
        resolve(x);
      }
    } catch (e) {
      if (called) {
        return;
      }
      called = true;
      reject(e);
    }
  } else {
    if (called) {
      return;
    }
    called = true;
    resolve(x);
  }
}

module.exports = ToyPromise;
