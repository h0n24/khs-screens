// import Tesseract from 'tesseract.js';

const Tesseract = require('tesseract.js');

Tesseract.recognize(
  'https://www.khsplzen.cz/images/KHS/covid19/Plzensky_kraj.jpg',
  'ces',
  { logger: m => console.log(m) }
).then(({ data: { text } }) => {
  console.log(text);
})