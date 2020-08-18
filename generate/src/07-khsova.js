const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  createWorker,
  createScheduler
} = require('tesseract.js');
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

const OCRpoziceDatum = [704, 40, 84, 15];

let OCRurl = [];
let sharpPromises = [];
let OCRjson = {};

// --- Příprava obrázků (černobílé, ořezy, apod.) ------------------------------

function generateOCRimage(crop, saveToFile) {
  sharpPromises.push(new Promise((resolve, reject) => {
    try {
      // treshold 180 zbarví pixely pod 180 do černé, 
      // zbytek bílá
      sharp('out/07-khsova-ocr.png')
        .extract({
          left: crop[0],
          top: crop[1],
          width: crop[2],
          height: crop[3]
        })
        .resize({
          height: 100
        })
        .sharpen(100)
        .modulate({
          brightness: 1.5,
          saturation: 0.5,
          // hue: 180
        })
        .normalise(true)
        .threshold(110) // 158 nebo 161
        .toFile(saveToFile, function (err) {
          if (err) throw (err);
          OCRurl.push(saveToFile);
          resolve();
        })
    } catch (error) {
      report(khs, "Nepodařilo se vytvořit ořezy obrázků k OCR (pro data)");
      reject();
    }
  }));
}

function generateOCRimageDate(crop, saveToFile) {
  sharpPromises.push(new Promise((resolve, reject) => {
    try {
      // treshold 180 zbarví pixely pod 180 do černé, 
      // zbytek bílá
      sharp('out/07-khsova-ocr.png')
        .extract({
          left: crop[0],
          top: crop[1],
          width: crop[2],
          height: crop[3]
        })
        .resize({
          height: 100
        })
        .sharpen(100)
        .modulate({
          brightness: 1.0,
          saturation: 1.5,
          // hue: 180
        })
        .normalise(true)
        .threshold(161) // 158 nebo 161
        .toFile(saveToFile, function (err) {
          if (err) throw (err);
          resolve();
        })
    } catch (error) {
      report(khs, "Nepodařilo se vytvořit ořezy obrázků k OCR (pro datum)");
      reject();
    }

  }));
}

function generateOCRimages() {
  return new Promise((resolve, reject) => {
    try {
      // zkontroluje jestli složka existuje
      var directory = `temp/${khs}/`;
      if (!fs.existsSync(directory)) {
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

      // vygenerujeme obrázek pro čtení data
      const saveToFile = `${directory}date.png`;
      generateOCRimageDate(OCRpoziceDatum, saveToFile);

      // počkáme, až se všechny obrázky vygenerují
      Promise.all(sharpPromises)
        .then(() => {
          (async () => {
            // console.log('OCR obrázky vygenerovány');
            await recognizeOCRimages();
            resolve();
          })();
        })
    } catch (error) {
      report(khs, "Nepodařilo se vygenerovat všechny OCR obrázky");
      reject();
    }
  });
}

// --- Recognize přes tesseract ------------------------------------------------

function recognizeOCRimages() {
  return new Promise((resolve, reject) => {
    (async () => {
      const scheduler = createScheduler();
      const scheduler2 = createScheduler();

      try {
        const worker1 = createWorker();
        const worker2 = createWorker();
        const worker3 = createWorker();

        // console.log("OCR čtení přes tesseract");

        let OCRjobs = [];

        // Tesseract OCR dat -------------------------------------------------------
        // OCR: veškerá data
        await worker1.load();
        await worker2.load();

        // bylo původně eng
        try {
          await worker1.loadLanguage('digits-ova');
          await worker2.loadLanguage('digits-ova');
          await worker1.initialize('digits-ova');
          await worker2.initialize('digits-ova');
        } catch (error) {
          report(khs, "worker 1 nebo 2 se nenačetly, je soubor používán?");
          reject();
        }

        const workerParameters = {
          tessedit_char_blacklist: "!?@#$%&*()<>_-+=/:;'\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
          tessedit_char_whitelist: '0123456789',
          classify_bln_numeric_mode: true
        };

        await worker1.setParameters(workerParameters);
        await worker2.setParameters(workerParameters);

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

        // OCR: pouze čas
        await worker3.load();

        // musí být eng, protože chceme detekovat i tečky a dvojtečky
        await worker3.loadLanguage('eng');
        await worker3.initialize('eng');

        const workerParametersDate = {
          tessedit_char_blacklist: "!?@#$%&*()<>_-+=/;'\"ABCDEFGHIJKLMNOPQRSTUWXYZabcdefghijklmnopqrstuwxyz",
          tessedit_char_whitelist: '0123456789.:,Vv',
          // classify_bln_numeric_mode: true
        };

        await worker3.setParameters(workerParametersDate);
        scheduler2.addWorker(worker3);

        const recognizeDate = scheduler2.addJob('recognize', `temp/${khs}/date.png`);
        const parsedDateData = await recognizeDate.then(result => result.data);

        // ukončení procesů
        await scheduler.terminate(); // It also terminates all workers.
        await scheduler2.terminate(); // It also terminates all workers.

        // zpracování dat ----------------------------------------------------------
        // samotná data
        generateOCRjson();

        // čas
        generateTimeJson(parsedDateData);

        // finální report
        report(khs, "OK");

        resolve();
      } catch (error) {
        report(khs, "Nepodařilo se rozeznat text z obrázku");
        await scheduler.terminate(); // It also terminates all workers.
        await scheduler2.terminate(); // It also terminates all workers.
        reject();
      }
    })();
  });
}

// --- Generování finálního json ------------------------------------------------

function generateOCRjson() {

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
      const OCRokresData = OCRjson[position + 1];

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
}

function generateTimeJson(parsedDateData) {
  let parsedDate = parsedDateData.text;
  if (parsedDate !== "") {

    // všechny V přemění na v
    parsedDate = parsedDate.replace("V", "v");
    // odstraní všechny duplikované mezery
    parsedDate = parsedDate.replace(/\s+/g, ' ');

    // <datum>v<čas>
    let [date, time] = parsedDate.split("v");

    date = date.replace(/[^0-9.]/g, "");
    time = time.replace(/[^0-9:]/g, "");

    let [den, mesic, rok] = date.split(".");

    den = den.replace(".", "");
    mesic = mesic.replace(".", "");

    den = parseInt(den, 10);
    mesic = parseInt(mesic, 10);
    rok = parseInt(rok, 10);

    mesic < 9 ? mesic = `0${mesic}` : mesic;
    den < 9 ? den = `0${den}` : den;

    const tempDate = `${rok}-${mesic}-${den}`;
    const dateTime = `${tempDate} ${time}`;

    let ISODate = new Date(dateTime).toISOString();

    save('out/time.json', {
      "07": ISODate
    });
  }
}


module.exports = new Promise((resolve, reject) => {
  (async () => {
    const OCRfilePath = "out/07-khsova-ocr.png";

    const checkFileExists = true;

    // někdy se stránka khsova nedá načíst pod méně než 30s,
    // je tedy dobré manuálně stáhnout slider a vložit ho do složky out
    // tato část kódu kontroluje, jestli už soubor neexistuje, 
    // aby mohl přeskočit stahování
    if (checkFileExists && fs.existsSync(OCRfilePath)) {

      report(khs, "OCR soubor byl nalezen, přeskakuji stahování");
      generateOCRimages().then(() => {
        resolve();
      });
    } else {
      let pageLoaded = true;
      let url;

      try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.setViewport({
          width: 1200,
          height: 850
        });

        await page.goto('http://www.khsova.cz/', {
          waitUntil: 'networkidle2'
        }).catch(e => {
          report(khs, e);
          pageLoaded = false;
        });

        if (pageLoaded) {
          // hledání url s obrázkem (každý den se URL mění)
          url = await page.evaluate(() => {
            try {
              let images = document.querySelectorAll(".tp-kbimg");
              let arr = Array.prototype.slice.call(images);
              for (let i = 0; i < arr.length; i += 1) {
                if (arr[i].src.includes('www.khsova.cz/sliders/slider_mapa_koronavirus')) {
                  return images[0].src;
                }
              } 
            } catch (error) {
              
            }
          }).catch(e => {
            report(khs, e);
            pageLoaded = false;
          });
        }

        // uvolníme puppeteer co nejdříve
        await browser.close();
      } catch (error) {
        report(khs, "Nepodařilo se z khsova.cz stáhnout slider s mapou koronaviru.");
        reject();
      }

      if (pageLoaded && url !== undefined) {
        // stažení verze pro OCR 
        try {
          const file = fs.createWriteStream(OCRfilePath);
          const request = http.get(url, function (response) {
            response.pipe(file);
          });

          file.on('finish', function () {
            // report(khs, "OCR soubor stažen");
            // inicializace
            generateOCRimages().then(() => {
              resolve();
            });
          });
        } catch (error) {
          report(khs, "Nepodařilo se stáhnout obrázek k OCR");
          reject();
        }
      }
    }
  })();
});