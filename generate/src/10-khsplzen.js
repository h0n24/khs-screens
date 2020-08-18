const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const {
  createWorker,
  createScheduler
} = require('tesseract.js');
const sharp = require('sharp');

const save = require('./_save');
const report = require('./_report');

const khs = "10-khsplzen";

// --- globální proměnné -------------------------------------------------------
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

// --- čištění času ------------------------------------------------------------
// ukázka: Aktualizováno: 16. 8. 2020 20:28
function parseTime(crawledTime) {
  try {
    let preparedTime = crawledTime.replace("Aktualizováno: ", "");

    let [den, mesic, rok, time] = preparedTime.split(" ");

    den = den.replace(".", "");
    mesic = mesic.replace(".", "");

    den = parseInt(den, 10);
    mesic = parseInt(mesic, 10);
    rok = parseInt(rok, 10);

    mesic < 9 ? mesic = `0${mesic}` : mesic;
    den < 9 ? den = `0${den}` : den;

    const tempDate = `${rok}-${mesic}-${den}`;
    dateTime = `${tempDate} ${time}`;
    let ISODate = new Date(dateTime).toISOString();

    save('out/time.json', {
      "10": ISODate
    });
  } catch (error) {}
}

// --- Příprava obrázků (černobílé, ořezy, apod.) ------------------------------

function generateOCRimage(crop, saveToFile) {
  sharpPromises.push(new Promise((resolve, reject) => {
    try {
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
          if (err) throw (err);
          OCRurl.push(saveToFile);
          resolve();
        })
    } catch (error) {
      report(khs, "Nepodařilo se vygenerovat obrázky pro OCR");
      reject();
    }
  }));
}

function generateOCRimages() {
  return new Promise((resolve, reject) => {
    try {
      // zkontroluje jestli složka existuje
      var dir = `temp/${khs}/`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      for (const pozice in OCRpozice) {
        if (OCRpozice.hasOwnProperty(pozice)) {
          const crop = OCRpozice[pozice];
          const saveToFile = `temp/${khs}/${pozice}.png`;
          generateOCRimage(crop, saveToFile);
        }
      }

      // Počkáme, až se všechny obrázky vygenerují
      Promise.all(sharpPromises)
        .then(() => {
          (async () => {
            // console.log('OCR obrázky vygenerovány');
            await recognizeOCRimages();
            resolve();
          })();
        })
    } catch (error) {
      report(khs, "Nepodařilo se vygenerovat obrázky");
      reject();
    }
  });
}

// --- Recognize přes tesseract ------------------------------------------------

function recognizeOCRimages(params) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // console.log("OCR čtení přes tesseract");
        const workerLoaded = false;
        let OCRjobs = [];

        let scheduler;
        let worker1;
        let worker2;

        // načtení workerů, někdy žel blbne
        try {
          scheduler = createScheduler();
          worker1 = createWorker({
            logger: m => console.log(m), // Add logger here
          });
          worker2 = createWorker({
            logger: m => console.log(m), // Add logger here
          });

          const workerParameters = {
            tessedit_char_blacklist: "!?@#$%&*()<>_-+=/:;'\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
            tessedit_char_whitelist: '0123456789',
            classify_bln_numeric_mode: true
          };

          const worker1test = await worker1
            .load()
            .loadLanguage('digits-plzen')
            .initialize('digits-plzen')
            // .setParameters(workerParameters)
            .catch(() => {
              report(khs, "worker 1 má problém");
            });

          const worker2test = await worker2
            .load()
            .loadLanguage('digits-plzen')
            .initialize('digits-plzen')
            // .setParameters(workerParameters)
            .catch(() => {
              report(khs, "worker 2 má problém");
            });

          worker1._currentJob = null;
          await scheduler.addWorker(worker1).catch(() => {
            report(khs, "worker 1 má problém");
          });

          worker2._currentJob = null;
          await scheduler.addWorker(worker2).catch(() => {
            report(khs, "worker 2 má problém");
          });

          workerLoaded = true;
        } catch (error) {
          report(khs, "worker 1 nebo 2 se nenačetly, je soubor používán?");

          await scheduler.terminate();
          reject();
        }

        if (workerLoaded === true) {
          console.log("test");
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

                let [, okres, sub] = key.split("-");
                [, okres] = okres.split(`/`);
                [sub, ] = sub.split(".");

                if (OCRjson[okres] === undefined) {
                  OCRjson[okres] = {};
                }

                OCRjson[okres][sub] = number;
              }
            }
          }

          await scheduler.terminate(); // It also terminates all workers.

          await generateOCRjson().then(() => {
            resolve();
          })
        }
      } catch (error) {
        report(khs, "Nepodařilo se rozpoznat obrázky");
        reject();
      }
    })();
  });
}

// --- Generování finálního json ------------------------------------------------

function generateOCRjson() {
  return new Promise((resolve, reject) => {
    try {

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
          const OCRokresData = OCRjson[position + 1];

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

      report(khs, "OK");

      resolve();
    } catch (error) {
      report(khs, "Nepodařilo se vygenerovat OCR Json");
      reject();
    }
  });
}

// --- Export ------------------------------------------------------------------
module.exports = new Promise((resolve, reject) => {
  (async () => {
    // získávání času ----------------------------------------------------------
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto('https://www.khsplzen.cz/odbory/odbor-epi/1928-aktualni-udaje-z-plzenskeho-kraje-sars-cov-2.html?tmpl=component&print=1&layout=default', {
        waitUntil: 'networkidle2'
      });

      // crawlování dat: nakažení a aktivní
      const crawledTime = await page.evaluate(() => {
        try {
          const date = document.querySelector(".art-postdateicon").innerText;
          return date;
        } catch (error) {

        }
      });

      // uvolníme puppeteer co nejdříve
      await browser.close();

      // čištění času
      parseTime(crawledTime);
    } catch (error) {
      report(khs, "Nemáme info o čase");
      reject();
    }

    // stažení verze pro OCR ---------------------------------------------------
    try {
      const OCRurl = "https://www.khsplzen.cz/images/KHS/covid19/Plzensky_kraj.jpg";

      const file = fs.createWriteStream("out/10-khsplzen-ocr.png");
      const request = https.get(OCRurl, function (response) {
        response.pipe(file);
      });

      file.on('finish', function () {
        // inicializace -> příprava OCR, čtení, generování JSONu
        generateOCRimages().then(() => {
          resolve();
        });
      });
    } catch (error) {
      report(khs, "Chyba při OCR");
      reject();
    }
  })();
});