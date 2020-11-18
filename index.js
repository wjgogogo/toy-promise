const ToyPromise = require("./src/toy-promise");

const p = new ToyPromise((resolve) => {
  resolve(
    new ToyPromise((resolve) => {
      resolve({
        then: (resolve) => {
          resolve("data");
        },
      });
    })
  );
});
p.then(
  (value) => console.log(value),
  (error) => console.warn(error)
);
