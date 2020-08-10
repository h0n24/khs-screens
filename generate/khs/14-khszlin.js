const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const { PdfReader } = require('pdfreader');
const { createWorker, createScheduler } = require('tesseract.js');
const sharp = require('sharp');

const save = require('./_save');

const OCRpozice = {
  "1": [161, 532, 120, 305],
  "2": [290, 532, 120, 305],
  "3": [420, 532, 120, 305],
  "4": [551, 532, 120, 305],
}

let OCRurl = [];
let sharpPromises = [];
let OCRjson = {};

// --- Příprava obrázků (černobílé, ořezy, apod.) ------------------------------

function generateOCRimage(crop, saveToFile) {
  sharpPromises.push(new Promise((resolve, reject) => {
    // treshold 180 zbarví pixely pod 180 do černé, 
    // zbytek bílá
    sharp('out/14-khszlin-ocr.png')
      .extract({
        left: crop[0],
        top: crop[1],
        width: crop[2],
        height: crop[3]
      })
      .resize({width: 240})
      .sharpen(100)
      .modulate({
        brightness: 1.5,
        saturation: 0.5,
        hue: 10
      })
      // .normalise(true)
      .threshold(140) // 158 nebo 161
      .toFile(saveToFile, function (err) {
        if (err) console.log(err);
        OCRurl.push(saveToFile);
        resolve();
      })
  }));
}

function generateOCRimages() {

  // zkontroluje jestli složka existuje
  var dir = 'ocr/khszlin/';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  for (const pozice in OCRpozice) {
    if (OCRpozice.hasOwnProperty(pozice)) {
      const crop = OCRpozice[pozice];
      const saveToFile = `ocr/khszlin/${pozice}.png`;
      generateOCRimage(crop, saveToFile);
    }
  }

  // Počkáme, až se všechny obrázky vygenerují
  Promise.all(sharpPromises)
    .then(() => {
      // console.log('OCR obrázky vygenerovány');
      recognizeOCRimages();
    })
}

// --- Recognize přes tesseract ------------------------------------------------

function recognizeOCRimages(params) {
  const scheduler = createScheduler();
  const worker1 = createWorker();
  const worker2 = createWorker();

  // console.log("OCR čtení přes tesseract");

  let OCRjobs = [];

  (async () => {
    await worker1.load();
    await worker2.load();

    // bylo původně eng
    await worker1.loadLanguage('digits');
    await worker2.loadLanguage('digits');
    await worker1.initialize('digits');
    await worker2.initialize('digits');

    const workerParameters = {
      tessedit_char_blacklist: "!?@#$%&*()<>_-+=/:;'\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      tessedit_char_whitelist: '0123456789',
      classify_bln_numeric_mode: true
    };

    await worker1.setParameters(workerParameters);
    await worker2.setParameters(workerParameters);

    scheduler.addWorker(worker1);
    scheduler.addWorker(worker2);

    const results = await Promise.all(OCRurl.map((url) => (
      OCRjobs[url] = scheduler.addJob('recognize', url)
    )))

    for (const key in OCRjobs) {
      if (OCRjobs.hasOwnProperty(key)) {
        const OCRpromise = OCRjobs[key];
        const {
          text
        } = await OCRpromise.then(result => result.data);

        if (text !== "") {

          const subtext = text.split("\n");
          let [nemocni, uzdraveni, zemreli, ] = subtext;
  
          // opravy
          // někdy se stane, že před číslo přidá 1 a mezeru
          let [, opravaZemreli] = zemreli.split(" ");
  
          if (opravaZemreli !== undefined) {
            zemreli = opravaZemreli;
          }

          nemocni = parseInt(nemocni, 10);
          uzdraveni = parseInt(uzdraveni, 10);
          zemreli = parseInt(zemreli, 10);

          let [, okres] = key.split("/khszlin/");
          [okres,] = okres.split(".");
  
          if (OCRjson[okres] === undefined) {
            OCRjson[okres] = {};
          }
          
          OCRjson[okres] = {c: nemocni, h: uzdraveni, d: zemreli};
        }
      }
    }
    generateOCRjson();

    await scheduler.terminate(); // It also terminates all workers.
  })();
}

// --- Generování finálního json ------------------------------------------------
function generateOCRjson(params) {

  // zpracování dat
  const obyvatelstvo = {
    "Kroměříž": 105343,
    "Uherské Hradiště": 142226,
    "Vsetín": 143334,
    "Zlín": 191652
  }

  let preparedData = [];

  for (var okres in obyvatelstvo) {
    if (obyvatelstvo.hasOwnProperty(okres)) {

      const position = Object.keys(obyvatelstvo).indexOf(okres);
      const OCRokresData = OCRjson[position+1];

      let pozitivni = null;
      if (OCRokresData.c) {
        pozitivni = OCRokresData.c;
      }

      let vyleceni = null;
      if (OCRokresData.h) {
        vyleceni = OCRokresData.h;
      }

      let umrti = null;
      if (OCRokresData.d) {
        umrti = OCRokresData.d;
      } else if (OCRokresData.d === 0) {
        umrti = 0;
      }

      let aktivni = null;
      if (pozitivni && vyleceni && umrti) {
        aktivni = pozitivni - vyleceni - umrti;
      } else if (pozitivni && vyleceni && umrti === 0) {
        aktivni = pozitivni - vyleceni;
      }

      const obyvatel = obyvatelstvo[okres];

      preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
    }
  }

  save('out/data.json', {
    "14": preparedData
  });

}

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000});
    await page.goto('http://www.khszlin.cz/', {waitUntil: 'networkidle2'});

    // hledání url s pdf (každý den se URL mění)
    const url = await page.evaluate(() => {
      let names = document.querySelectorAll('.pdf');
      let arr = Array.prototype.slice.call(names);
      for (let i = 0; i < arr.length; i += 1) {

        if (arr[i].innerHTML.includes('Informace o výskytu koronaviru ve Zlínském kraji')) {
          return arr[i].href;
        }
      }
    });

    const page2 = await browser.newPage();
    await page2.setViewport({ width: 820, height: 1200});
    await page2.goto(`https://docs.google.com/viewer?url=${url}`, {waitUntil: 'networkidle2'});

    // screenshot pro OCR
    await page2.screenshot({
      path: 'out/14-khszlin-ocr.png'
    });

    // začátek ocr, přípravy + čtení přes tesseract
    generateOCRimages(); 

    // ukládání pdf
    const file = fs.createWriteStream("out/14-khszlin.pdf");
    const request = http.get(url, function (response) {
      response.pipe(file);
    });
  
    await browser.close();
  })();
}