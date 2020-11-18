// Promise 三种状态
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class ToyPromise {
  constructor(executor) {
    // Promise默认状态是pending
    this.status = PENDING;

    // 用于存放成功的值
    this.value = undefined;
    // 用于存放成功的回调
    this.onFulfilledQueue = [];

    // 用于存放失败的原因
    this.reason = undefined;
    // 用于存放失败的回调
    this.onRejectedQueue = [];

    try {
      // 立即执行executor
      executor(this.resolve, this.reject);
    } catch (error) {
      // 如果执行executor发生错误，这把该Promise置为失败
      this.reject(error);
    }
  }

  // resolve函数需要记住this值，所以使用箭头函数
  resolve = (value) => {
    resolvePromise(
      undefined,
      value,
      (x) => {
        // 如果不是pending状态，说明该Promise已经结束，则提前退出，防止多次调用resolve方法
        if (this.status !== PENDING) {
          return;
        }
        this.status = FULFILLED;
        this.value = x;
        // 依次执行相应的回调
        this.onFulfilledQueue.forEach((fn) => fn(x));
      },
      this.reject
    );
  };

  // reject函数需要记住this值，所以使用箭头函数
  reject = (reason) => {
    // 如果不是pending状态，说明该Promise已经结束，则提前退出，防止多次调用reject方法
    if (this.status !== PENDING) {
      return;
    }

    this.status = REJECTED;
    this.reason = reason;
    // 依次执行相应的回调
    this.onRejectedQueue.forEach((fn) => fn(reason));
  };

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };
    // 返回一个新的Promise
    const p = new ToyPromise((resolve, reject) => {
      // 如果状态是pending，则先将两个回调存起来
      if (this.status === PENDING) {
        this.onFulfilledQueue.push((value) => {
          setTimeout(() => {
            try {
              const x = onFulfilled(value);
              // x可能是一个Promise或者thenable对象
              resolvePromise(p, x, resolve, reject);
            } catch (error) {
              reject(error);
            }
          });
        });
        this.onRejectedQueue.push((reason) => {
          setTimeout(() => {
            try {
              const x = onRejected(reason);
              resolvePromise(p, x, resolve, reject);
            } catch (error) {
              reject(error);
            }
          });
        });
      } else if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            const x = onFulfilled(this.value);
            resolvePromise(p, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      } else {
        setTimeout(() => {
          try {
            const x = onRejected(this.reason);
            resolvePromise(p, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      }
    });

    return p;
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onResolved) {
    return this.then(
      (value) => ToyPromise.resolve(onResolved()).then(() => value),
      (reason) =>
        ToyPromise.resolve(onResolved()).then(() => {
          throw reason;
        })
    );
  }

  static resolve(value) {
    return new ToyPromise((resolve) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new ToyPromise((resolve, reject) => {
      reject(reason);
    });
  }
  static all(promises) {
    if (!Array.isArray(promises)) {
      return TypeError(`TypeError: ${promises} is not array`);
    }
    return new ToyPromise((resolve, reject) => {
      const result = [];
      let resolvedCount = 0;

      promises.forEach((promise, idx) => {
        // 将所有对象首先转换为Promise再统一处理
        ToyPromise.resolve(promise).then((value) => {
          result[idx] = value;
          if (++resolvedCount === promises.length) {
            resolve(result);
          }
        }, reject);
      });
    });
  }

  static race(promises) {
    if (!Array.isArray(promises)) {
      return TypeError(`TypeError: ${promises} is not array`);
    }
    return new ToyPromise((resolve, reject) => {
      promises.forEach((promise) => {
        ToyPromise.resolve(promise).then(resolve, reject);
      });
    });
  }

  static any(promises) {
    if (!Array.isArray(promises)) {
      return TypeError(`TypeError: ${promises} is not array`);
    }
    return new ToyPromise((resolve, reject) => {
      const result = [];
      let resolvedCount = 0;

      promises.forEach((promise, idx) => {
        // 将所有对象首先转换为Promise再统一处理
        ToyPromise.resolve(promise).then(resolve, (reason) => {
          result[idx] = reason;
          if (++resolvedCount === promises.length) {
            reject(result);
          }
        });
      });
    });
  }

  static allSettled(promises) {
    if (!Array.isArray(promises)) {
      return TypeError(`TypeError: ${promises} is not array`);
    }
    return new ToyPromise((resolve, reject) => {
      const result = [];
      let resolvedCount = 0;

      const saveResult = (data, idx) => {
        result[idx] = data;
        if (++resolvedCount === promises.length) {
          resolve(result);
        }
      };

      promises.forEach((promise, idx) => {
        ToyPromise.resolve(promise).then(
          (value) => {
            saveResult(value, idx);
          },
          (reason) => {
            saveResult(reason, idx);
          }
        );
      });
    });
  }
}

function resolvePromise(promise, x, resolve, reject) {
  // 如果promise和x是同一个对象，那么就会出现自己等待自己完成的问题
  // 如果是通过resolve调用，promise为undefined，需要将这种情况排除
  if (promise && promise === x) {
    return reject(TypeError("Chaining cycle detected"));
  }

  // 规范中规定resolve和reject只能调用一次，使用called作为是否promise已经完成的标识
  // 虽然多次调用也没有问题
  let called = false;
  if ((x && typeof x === "object") || typeof x === "function") {
    let then;
    try {
      //将这句代码放入try/catch中，用于处理对象的设置了then的get操作符直接抛出错误的情况
      then = x.then;
      if (typeof then === "function") {
        then.call(
          x,
          (value) => {
            if (called) {
              return;
            }
            called = true;
            // 继续递归解析
            resolvePromise(promise, value, resolve, reject);
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
        // 如果then不是一个函数，则直接resolve
        resolve(x);
      }
    } catch (error) {
      if (called) {
        return;
      }
      called = true;
      reject(error);
    }
  } else {
    if (called) {
      return;
    }
    called = true;
    // 如果x是一个普通值，则直接resolve
    resolve(x);
  }
}

module.exports = ToyPromise;
