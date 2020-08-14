const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const { createWorker, createScheduler } = require('tesseract.js');
const sharp = require('sharp');

const save = require('./_save');

const OCRpozice = {
    "1-c": [116, 282, 55, 36],
    "1-h": [172, 282, 55, 36],
    "1-d": [144, 319, 55, 36],
    "2-c": [284, 264, 55, 36],
    "2-h": [340, 264, 55, 36],
    "3-c": [278, 323, 60, 36],
    "3-h": [278, 360, 60, 36],
    "3-d": [278, 397, 60, 36],
    "4-c": [433, 350, 55, 36],
    "4-h": [489, 350, 55, 36],
    "5-c": [409, 452, 55, 36],
    "5-h": [465, 452, 55, 36],
    "5-d": [437, 489, 55, 36],
    "6-c": [127, 429, 60, 36],
    "6-h": [188, 429, 59, 36],
    "6-d": [160, 466, 55, 36],
    "7-c": [281, 588, 61, 36],
    "7-h": [343, 588, 55, 36]
}

let OCRurl = [];
let sharpPromises = [];
let OCRjson = {};

// --- Příprava obrázků (černobílé, ořezy, apod.) ------------------------------

function generateOCRimage(crop, saveToFile) {
  sharpPromises.push(new Promise((resolve, reject) => {
    // zapíná a vypíná okraj pro účely testování
    const okraj = true;
    const okraj1 = okraj ? 1 : 0;
    const okraj2 = okraj ? -2 : 0;

    // treshold 180 zbarví pixely pod 180 do černé, 
    // zbytek bílá
    sharp('out/10-khsplzen-ocr.png')
      .extract({
        left: crop[0] + okraj1,
        top: crop[1] + okraj1,
        width: crop[2] + okraj2,
        height: crop[3] + okraj2
      })
      .modulate({
        brightness: 0.1,
        saturation: 2.5,
        hue: 180
      })
      .normalise(true)
      // .sharpen(1)
      .threshold(157) // 158 nebo 161
      .toFile(saveToFile, function (err) {
        if (err) console.log(err);
        OCRurl.push(saveToFile);
        resolve();
      })
  }));
}

function generateOCRimages() {

  // zkontroluje jestli složka existuje
  var dir = 'ocr/khsplzen/';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  for (const pozice in OCRpozice) {
    if (OCRpozice.hasOwnProperty(pozice)) {
      const crop = OCRpozice[pozice];
      const saveToFile = `ocr/khsplzen/${pozice}.png`;
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
    await worker1.loadLanguage('digits-plzen');
    await worker2.loadLanguage('digits-plzen');
    await worker1.initialize('digits-plzen');
    await worker2.initialize('digits-plzen');

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
          [,okres] = okres.split("/khsplzen/");
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

function generateOCRjson() {

    // zpracování dat
    const obyvatelstvo = {
      "Tachov": 54336,
      "Plzeň-sever": 79979,
      "Plzeň-město": 194280,
      "Rokycany": 49349,
      "Plzeň-jih": 63488,
      "Domažlice": 62062,
      "Klatovy": 86405
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
        }

        let aktivni = null;
        if (pozitivni && vyleceni && umrti) {
          aktivni = pozitivni - vyleceni - umrti;
        }

        const obyvatel = obyvatelstvo[okres];

        preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
      }
    }

    save('out/data.json', {
      "10": preparedData
    });
}

// --- Export ------------------------------------------------

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 2700});
    await page.goto('https://www.khsplzen.cz/', {waitUntil: 'networkidle2'});

    // úprava css - očištění od nesmyslů
    await page.evaluate(async () => {
      const style = document.createElement('style');
      style.type = 'text/css';
      const content = `
        #art-main, .art-post {
          background: #FFF !important;
        }
        .art-post {
          border: none !important;
          box-shadow: none !important;
        }
        td {
          border: none !important;
        }
        iframe {
          display:none;
        }
        img[src="/images/KHS/covid19/Jak_chránit_sebe_a_své_okolí.png"] {
          display:none;
        }
        img[src="/images/banners/infolinky-SZU-TRI-linky-1-s.jpg"] {
          display: none;
        }
        img[src="/images/banners/inforlinky-pojistoven-s.png"] {
          display: none;
        }
        img[src="/images/MZCR/Prevence-koronavirus.png"] {
          display: none;
        }
      `;
      style.appendChild(document.createTextNode(content));
      const promise = new Promise((resolve, reject) => {
        style.onload = resolve;
        style.onerror = reject;
      });
      document.head.appendChild(style);
      await promise;
    });

    // screenshot
    await page.screenshot({
      path: 'out/10-khsplzen.png',
      clip: {
        x: 70,
        y: 800,
        width: 1080,
        height: 1800
      }
    });

    // stažení verze pro OCR 
    const file = fs.createWriteStream("out/10-khsplzen-ocr.png");
    const request = https.get("https://www.khsplzen.cz/images/KHS/covid19/Plzensky_kraj.jpg", function (response) {
      response.pipe(file);
    });

    file.on('finish', function () {
      // inicializace -> příprava OCR, čtení, generování JSONu
      generateOCRimages();
    });
  
    await browser.close();
  })();
}