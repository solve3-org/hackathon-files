const { getRandomFromArray } = require("./helper");
var openmoji = require('../data/openmoji-names.json');
var Image = require('ascii-art-image');
var AU = require('ansi_up');
var ansi_up = new AU.default;

const asciiAlphabet = [
  "variant3",
  "ultra-wide",
  "wide",
  "bits",
  "greyscale",
  "blocks"
]

const getRandomMojiName = () => {
  const random = Math.floor(Math.random() * 4083);
  return openmoji[random];
}

const getRandomMojiArray = (count) => {
  let result = new Set();
  while (result.size < count) {
    result.add(getRandomMojiName());
  }
  return [...result];
}

const createAscii = async (filename) => {
  var image = new Image({
    filepath: "./data/openmoji-png/" + filename + ".png",
    alphabet: getRandomFromArray(asciiAlphabet),
    width: 50,
    height: 50,
  });

  return new Promise((resolve, reject) => {
    image.write(function (err, rendered) {
      if (err) reject(err)
      // console.log(rendered)
      let ansi = ansi_up.ansi_to_html(rendered);
      let spanToTable = ansi.replace(/<span>/g, '<td><span class="solve3-pixel">').replace(/<\/span>/g, '</span></td>').replace(/> </g, '>&#10240<');
      let addedBreakpoint = spanToTable.replace(/\n/g, '</tr><br /><tr>');
      let surrounded = '<tr>' + addedBreakpoint + '</tr>';
      resolve(surrounded)
    })
  })
}

const getCaptchaObject = async (num) => {
  let asciiOk = false;

  let selection, solution, ascii;

  while (!asciiOk) {
    selection = getRandomMojiArray(num);
    solution = getRandomFromArray(selection);

    if (solution) { // sometimes solution is undefined - idk why
      ascii = await createAscii(solution)

      //bad ascii filter
      var spanCount = (ascii.match(/<span/g) || []).length; // count "pixel"
      var badPixel = (ascii.match(/(0,[\s\S]*?,0)/g) || []).length // count fields with rgb(0,*,0) ->  too dark
        + (ascii.match(/(1,[\s\S]*?,1)/g) || []).length // count fields with rgb(1,*,1) -> too dark
        + (ascii.match(/\(178\,/g) || []).length // count fields with rgb(178,*,*) -> too dark
        + (ascii.match(/>⠀</g) || []).length // count empty fields

      if (badPixel <= (spanCount / 10 * 9))
        asciiOk = true;
    }
  }

  return {
    selection: selection,
    solution: solution,
    ascii: ascii
  }
}

module.exports = {
  getCaptchaObject
}