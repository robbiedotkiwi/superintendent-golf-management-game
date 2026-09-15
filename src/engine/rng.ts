export function createRng(seed) {
  let current = seed >>> 0;
  return {
    get seed() {
      return current;
    },
    next() {
      current = (Math.imul(1664525, current) + 1013904223) >>> 0;
      return current / 4294967296;
    },
  };
}
