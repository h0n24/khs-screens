const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createWorker, createScheduler } = require('tesseract.js');
const sharp = require('sharp');

const save = require('./_save');
const report = require('./_report');

const khs = "07-khsova";

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
        if (err) throw(err);
        OCRurl.push(saveToFile);
        resolve();
      })
  }));
}

function generateOCRimages() {

  // zkontroluje jestli složka existuje
  var directory = `temp/${khs}/`;
  if (!fs.existsSync(directory)){
      fs.mkdirSync(directory);
  }

  // synchronní mazání obsahu složky
  const files = fs.readdirSync(directory);
  for (const file of files) {
    fs.unlink(path.join(directory, file), err => {
      if (err) throw err;
    });
  }

  // vygenerujeme obrázky pro OCR (co nejmenší, černá, kontrast apod.)
  for (const pozice in OCRpozice) {
    if (OCRpozice.hasOwnProperty(pozice)) {
      const crop = OCRpozice[pozice];
      const saveToFile = `${directory}${pozice}.png`;
      generateOCRimage(crop, saveToFile);
    }
  }

  // počkáme, až se všechny obrázky vygenerují
  Promise.all(sharpPromises)
    .then(() => {
      // console.log('OCR obrázky vygenerovány');
      recognizeOCRimages();
    })
}

// --- Recognize přes tesseract ------------------------------------------------

function recognizeOCRimages() {
  const scheduler = createScheduler();
  const worker1 = createWorker();
  const worker2 = createWorker();

  // console.log("OCR čtení přes tesseract");

  let OCRjobs = [];

  (async () => {
    await worker1.load();
    await worker2.load();

    // bylo původně eng
    await worker1.loadLanguage('digits-ova');
    await worker2.loadLanguage('digits-ova');
    await worker1.initialize('digits-ova');
    await worker2.initialize('digits-ova');

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

          let [ , okres, sub ] = key.split("-");
          [,okres] = okres.split(`/`);
          [sub,] = sub.split(".");
  
          if (OCRjson[okres] === undefined) {
            OCRjson[okres] = {};
          }
          
          OCRjson[okres][sub] = number;
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
      "Bruntál": 91597,
      "Opava": 176236,
      "Nový Jičín": 151577,
      "Ostrava": 320145,
      "Karviná": 246324,
      "Frýdek-Místek": 214660
    }

    let preparedData = [];

    for (var okres in obyvatelstvo) {
      if (obyvatelstvo.hasOwnProperty(okres)) {

        const position = Object.keys(obyvatelstvo).indexOf(okres);
        const OCRokresData = OCRjson[position+1];

        let pozitivni = null;
        if (OCRokresData.k && OCRokresData.t) {
          const komunitni = parseInt(OCRokresData.k, 10);
          const cestovatelska = parseInt(OCRokresData.t, 10);
          pozitivni = komunitni + cestovatelska;

          // console.log(`${OCRokresData}: k:${komunitni} c:${cestovatelska} poz:${pozitivni}`);
        }

        let vyleceni = null;
        if (OCRokresData.h) {
          vyleceni = OCRokresData.h;
        }

        let umrti = null;
        let aktivni = null;

        const obyvatel = obyvatelstvo[okres];

        preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
      }
    }

    save('out/data.json', {
      "07": preparedData
    });

    report(khs, "OK");
}


module.exports = function () {
  (async () => {
    const OCRfilePath = "out/07-khsova-ocr.png";

    // někdy se stránka khsova nedá načíst pod méně než 30s,
    // je tedy dobré manuálně stáhnout slider a vložit ho do složky out
    // tato část kódu kontroluje, jestli už soubor neexistuje, 
    // aby mohl přeskočit stahování
    if (fs.existsSync(OCRfilePath)) {

      report(khs, "OCR soubor byl nalezen, přeskakuji stahování");
      generateOCRimages();
    } else {

      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.setViewport({
        width: 1200,
        height: 850
      });
      await page.goto('http://www.khsova.cz/', {
        waitUntil: 'networkidle2'
      });
  
      // hledání url s obrázkem (každý den se URL mění)
      const url = await page.evaluate(() => {
        let images = document.querySelectorAll(".tp-kbimg");
        let arr = Array.prototype.slice.call(images);
        for (let i = 0; i < arr.length; i += 1) {
          if (arr[i].src.includes('www.khsova.cz/sliders/slider_mapa_koronavirus')) {
            return images[0].src;
          }
        }
      });
  
      // stažení verze pro OCR 
      const file = fs.createWriteStream(OCRfilePath);
      const request = http.get(url, function (response) {
        response.pipe(file);
      });
  
      file.on('finish', function () {
        // report(khs, "OCR soubor stažen");
        // inicializace
        generateOCRimages();
      });
  
      await browser.close();
    }
  })();
}