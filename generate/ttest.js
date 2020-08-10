const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const { createWorker, createScheduler } = require('tesseract.js');
const sharp = require('sharp');

const OCRpozice = {
    "1-t": [267, 109, 30, 12],
    "1-k": [267, 122, 30, 12],
    "1-h": [267, 135, 30, 12],
    "2-t": [347, 153, 30, 12],
    "2-k": [347, 165, 30, 12],
    "2-h": [347, 179, 30, 12],
    "3-t": [381, 221, 30, 12],
    "3-k": [381, 233, 30, 12],
    "3-h": [381, 245, 30, 12],
    "4-t": [439, 180, 30, 12],
    "4-k": [439, 192, 30, 12],
    "4-h": [439, 204, 30, 12],
    "5-t": [484, 174, 30, 12],
    "5-k": [484, 186, 30, 12],
    "5-h": [484, 198, 30, 12],
    "6-t": [467, 253, 30, 12],
    "6-k": [467, 266, 30, 12],
    "6-h": [467, 279, 30, 12]
}

let OCRurl = [];
let sharpPromises = [];
let OCRjson = {};

// --- Příprava obrázků (černobílé, ořezy, apod.) ------------------------------

function generateOCRimage(crop, saveToFile) {
  sharpPromises.push(new Promise((resolve, reject) => {

    // treshold 180 zbarví pixely pod 180 do černé, 
    // zbytek bílá
    sharp('out/07-khsova-ocr.png')
      .extract({
        left: crop[0],
        top: crop[1],
        width: crop[2],
        height: crop[3]
      })
      .resize({height: 100})
      .sharpen(100)
      .modulate({
        brightness: 1.5,
        saturation: 0.5,
        // hue: 180
      })
      .normalise(true)
      .threshold(110) // 158 nebo 161
      .toFile(saveToFile, function (err) {
        if (err) console.log(err);
        OCRurl.push(saveToFile);
        resolve();
      })
  }));
}

function generateOCRimages() {

  // zkontroluje jestli složka existuje
  var dir = 'ocr/khsova/';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  for (const pozice in OCRpozice) {
    if (OCRpozice.hasOwnProperty(pozice)) {
      const crop = OCRpozice[pozice];
      const saveToFile = `ocr/khsova/${pozice}.png`;
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

// inicializace
generateOCRimages();

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
          const number = parseInt(text, 10);

          let [ okres, sub ] = key.split("-");
          [,okres] = okres.split("/khsova/");
          [sub,] = sub.split(".");
  
          if (OCRjson[okres] === undefined) {
            OCRjson[okres] = {};
          }
          
          OCRjson[okres][sub] = number;
        }
      }
    }
    console.log(OCRjson);

    await scheduler.terminate(); // It also terminates all workers.
  })();
}

// --- Generování finálního json ------------------------------------------------

function generateOCRjson(params) {
  

}


// --- Recognize přes tesseract ------------------------------------------------