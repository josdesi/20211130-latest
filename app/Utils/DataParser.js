function parseInteger(input) {
  const parsedInput = Number.parseInt(input)
  if (Number.isNaN(parsedInput)) return null;

  return parsedInput;
}

function parseArrayOfIntegers(input) {
  const inputAsArray = Array.isArray(input) ? input : [input];
  return inputAsArray.map(elem => parseInteger(elem)).filter(elem => !!elem);
}

module.exports = {
  parseArrayOfIntegers,
  parseInteger
};