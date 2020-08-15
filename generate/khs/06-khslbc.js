const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const {
  PdfReader
} = require('pdfreader');

const save = require('./_save');

const obyvatelstvo = {
  "Česká Lípa": 103300,
  "Jablonec nad Nisou": 90667,
  "Liberec": 175626,
  "Semily": 74097
};

function addOnlyUnique(jmenoOkresu, pdfDataOkresy) {
  let isSet = false;
  for (const key in pdfDataOkresy) {
    if (pdfDataOkresy.hasOwnProperty(key)) {
      const okres = pdfDataOkresy[key];
      if (jmenoOkresu === okres) {
        isSet = true;
      }
    }
  }
  if (isSet === false) {
    pdfDataOkresy.push(jmenoOkresu);
  }
}

function parsePDFitem(item, pdfData, pdfDataOkresy, pdfFinal) {

  if (item.text === "Onemocnění COVID") {

  } else if (item.text === "19 v LK") {

  } else if (item.text === "-") {

  } else if (item.text === "Česká Lípa") {
    addOnlyUnique("Česká Lípa", pdfDataOkresy);

  } else if (item.text === "Jablonec n/N") {
    addOnlyUnique("Jablonec nad Nisou", pdfDataOkresy);

  } else if (item.text === "Liberec") {
    addOnlyUnique("Liberec", pdfDataOkresy);

  } else if (item.text === "Semily") {
    addOnlyUnique("Semily", pdfDataOkresy);

  } else if (item.text === 'kumulativní počet případů onemocnění dle okresů') {

    const tempData = pdfData.slice(0, 4);
    pdfFinal.push({
      c: tempData
    });
    pdfData.splice(0, 4);

  } else if (item.text === 'počet aktivních případů dle okresů') {

    const tempData = pdfData.slice(0, 4);
    pdfFinal.push({
      a: tempData
    });
    pdfData.splice(0, 4);

  } else if (item.text === 'počet uzdravených osob dle okresů') {

    const tempData = pdfData.slice(0, 4);
    pdfFinal.push({
      h: tempData
    });
    pdfData.splice(0, 4);

  } else {
    pdfData.push(item.text);
  }
}

function parsePDFafter(pdfData, pdfDataOkresy, pdfFinal, preparedData) {
  // ve zbytku pdfData lze nalézt poslední datum aktualizace
  // console.log(pdfData);

  for (let index = 0; index < pdfDataOkresy.length; index++) {
    const okres = pdfDataOkresy[index];
    const obyvatel = obyvatelstvo[okres];

    let pozitivni = null;
    let vyleceni = null;
    let aktivni = null;

    for (const key in pdfFinal) {
      if (pdfFinal.hasOwnProperty(key)) {
        const element = pdfFinal[key];
        const [category] = Object.keys(element);

        if (category === 'c') {
          pozitivni = element[category][index];
          pozitivni = parseInt(pozitivni, 10);
        }
        if (category === 'h') {
          vyleceni = element[category][index];
          vyleceni = parseInt(vyleceni, 10);
        }
        if (category === 'a') {
          aktivni = element[category][index];
          aktivni = parseInt(aktivni, 10);
        }
      }
    }

    let umrti = null;
    if (Number.isInteger(pozitivni) && Number.isInteger(aktivni) && Number.isInteger(vyleceni)) {
      umrti = pozitivni - aktivni - vyleceni;
    }

    preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
  }

  // finálně uloží data do souboru
  saveToFile(preparedData);
}

function saveToFile(data) {
  save('out/data.json', {
    "06": data
  });
}

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let pdfData = [];
    let pdfDataOkresy = [];
    let pdfFinal = [];
    let preparedData = [];

    // screenshot --------------------------------------------------------------
    await page.setViewport({
      width: 510,
      height: 500
    });
    await page.goto('http://www.khslbc.cz/', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.evaluate(() => {
      window.scrollBy(240, 1350);
    });

    await page.screenshot({
      path: 'out/06-khslbc.png'
    });

    // Vyhledání pdf souboru (url se každý den mění) ---------------------------
    await page.setViewport({
      width: 1000,
      height: 1000
    });
    await page.goto('https://www.khslbc.cz/khs_informace_covid-19/', {
      waitUntil: 'networkidle2'
    });

    // hledání url s pdf (každý den se URL mění)
    const url = await page.evaluate(() => {
      let names = document.querySelectorAll('.mtli_pdf');
      let arr = Array.prototype.slice.call(names);
      for (let i = 0; i < arr.length; i += 1) {

        if (arr[i].innerHTML.includes('Onemocnění COVID-19 v LK dle okresů')) {
          return arr[i].href;
        }
      }
    });

    // ukládání pdf a parsování pdf --------------------------------------------
    const file = fs.createWriteStream("out/06-khslbc.pdf");
    const request = https.get(url, function (response) {
      response.pipe(file);

      // After all the data is saved
      response.on('end', function () {
        new PdfReader().parseFileItems("out/06-khslbc.pdf", function (err, item) {
          if (err) {
            console.error(err);
          } else if (!item) {
            /* pdfreader queues up the items in the PDF and passes them to
             * the callback. When no item is passed, it's indicating that
             * we're done reading the PDF. */
            // console.log('Done.');
            parsePDFafter(pdfData, pdfDataOkresy, pdfFinal, preparedData);
          } else if (item.file) {
            // File items only reference the PDF's file path.
            // console.log(`Parsing ${item.file && item.file.path || 'a buffer'}`)
          } else if (item.page) {
            // Page items simply contain their page number.
            // console.log(`Reached page ${item.page}`);
          } else if (item.text) {
            // Goes through every item in the pdf file
            parsePDFitem(item, pdfData, pdfDataOkresy, pdfFinal);
          }
        });
      });
    });

    await browser.close();
  })();
}