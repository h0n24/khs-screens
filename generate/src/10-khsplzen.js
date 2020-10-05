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
const ofr = 45+2; // offset right
const oft = 31+2; // offset top
const OCRpozice = {
  "1-c": [86, 203, 45, 31], //tach
  "1-h": [86+ofr, 203, 45, 31],
  "1-d": [86+ofr, 203+oft, 45, 31],
  "1-a": [86, 203+oft, 45, 31],

  "2-c": [236, 170, 45, 31], //sev
  "2-h": [236+ofr, 170, 45, 31],
  "2-d": [236+ofr, 170+oft, 45, 31],
  "2-a": [236, 170+oft, 45, 31],

  "3-c": [181, 302, 52, 31], //měs
  "3-h": [181+ofr+7, 302, 45, 31],
  "3-d": [181+ofr+7, 302+oft, 45, 31],
  "3-a": [181, 302+oft, 52, 31],

  "4-c": [377, 236, 45, 31], //rok
  "4-h": [377+ofr, 236, 45, 31],
  "4-d": [377+ofr, 236+oft, 45, 31],
  "4-a": [377, 236+oft, 45, 31],

  "5-c": [330, 447, 45, 31], //jih
  "5-h": [330+ofr, 447, 45, 31],
  "5-d": [330+ofr, 447+oft, 45, 31],
  "5-a": [330, 447+oft, 45, 31],

  "6-c": [86, 447, 45, 31], //dom
  "6-h": [86+ofr, 447, 45, 31],
  "6-d": [86+ofr, 447+oft, 45, 31],
  "6-a": [86, 447+oft, 45, 31],

  "7-c": [236, 566, 45, 31], //kla
  "7-h": [236+ofr, 566, 45, 31],
  "7-d": [236+ofr, 566+oft, 45, 31],
  "7-a": [236, 566+oft, 45, 31]
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
      const scheduler = createScheduler();
      try {
        // console.log("OCR čtení přes tesseract");
        let OCRjobs = [];

        // načtení workerů, někdy žel blbne
        const worker1 = createWorker({
          // logger: m => console.log(m), // Add logger here
        });
        const worker2 = createWorker({
          // logger: m => console.log(m), // Add logger here
        });

        const workerParameters = {
          tessedit_char_blacklist: "!?@#$%&*()<>_-+=/:;'\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
          tessedit_char_whitelist: '0123456789',
          classify_bln_numeric_mode: true
        };

        const worker1load = await worker1.load();
        const worker1loadLang = await worker1.loadLanguage('digits-plzen');
        const worker1init = await worker1.initialize('digits-plzen');
        const worker1params = await worker1.setParameters(workerParameters);
        const worker2load = await worker2.load();
        const worker2loadLang = await worker2.loadLanguage('digits-plzen2');
        const worker2init = await worker2.initialize('digits-plzen2');
        const worker2params = await worker2.setParameters(workerParameters);

        worker1._currentJob = null;
        scheduler.addWorker(worker1);

        worker2._currentJob = null;
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
      } catch (error) {
        report(khs, "Nepodařilo se rozpoznat obrázky");
        await scheduler.terminate(); // It also terminates all workers.
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
          if (OCRokresData.c !== null) {
            pozitivni = parseInt(OCRokresData.c, 10);
          }

          let vyleceni = null;
          if (OCRokresData.h !== null) {
            vyleceni = parseInt(OCRokresData.h, 10);
          }

          let umrti = null;
          if (OCRokresData.d !== null) {
            umrti = parseInt(OCRokresData.d, 10);
          }

          let aktivni = null;
          if (OCRokresData.a !== null) {
            aktivni = parseInt(OCRokresData.a, 10);
          }

          let testAktivni = null;
          if (pozitivni && vyleceni && umrti) {
            testAktivni = pozitivni - vyleceni - umrti;

            if (testAktivni !== aktivni) {
              report(khs, "Nesedí křížový test pro aktivní");
            }
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