const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createWorker, createScheduler } = require('tesseract.js');
const sharp = require('sharp');
const express = require('express');

const save = require('./_save');
const report = require('./_report');

const khs = "14-khszlin";

const OCRpozice = {
  "1": [155, 500, 120, 305],
  "2": [290, 500, 120, 305],
  "3": [425, 500, 120, 305],
  "4": [560, 500, 120, 305],
}

let OCRurl = [];
let sharpPromises = [];
let OCRjson = {};

// --- Převod z pdf na obrázek -------------------------------------------------
function prepareOCRimage() {
  return new Promise((resolve, reject) => {
    (async () => {
      // pro účely převodu pdf na obrázek je třeba vytvořit server
      const srvPort = 8771;
      const srvURL = "http://localhost";
  
      const app = express();
      const serv = http.createServer(app);
  
      app.use('/', express.static('./'));
  
      app.get('/close', function (req, res) {
        res.send("CLOSING");
        serv.close();
      });
  
      serv.listen(srvPort, function () {
        // console.log("server starting");
      });
  
      // puppeteer crawluje tento server, aby přes připravený pdf-reader vytvořil screenshot, bohužel pro windows neexistuje žádná stabilnější knihovna, která by převáděla pdf na png
      const browser2 = await puppeteer.launch();
      const page2 = await browser2.newPage();
  
      await page2.setViewport({
        width: 820,
        height: 1200
      });
  
      await page2.goto(`${srvURL}:${srvPort}/other/pdf-reader/web/?file=../../../out/14-khszlin.pdf`, {
        waitUntil: 'networkidle0'
      });
  
      // screenshot pro OCR
      await page2.screenshot({
        path: `out/${khs}.png`
      });
  
      // vypnutí serveru po převodu z pdf na obrázek
      await page2.goto(`${srvURL}:${srvPort}/close/`, {
        waitUntil: 'networkidle2'
      });
  
      await browser2.close();
  
      // začátek ocr, přípravy + čtení přes tesseract
      await generateOCRimages().then(()=> {
        resolve();
      })
    })();
  });
}

// --- Příprava obrázků (černobílé, ořezy, apod.) ------------------------------

function generateOCRimage(crop, saveToFile) {
  sharpPromises.push(new Promise((resolve, reject) => {
    // treshold 180 zbarví pixely pod 180 do černé, 
    // zbytek bílá
    sharp(`out/${khs}.png`)
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
        if (err) throw(err);
        OCRurl.push(saveToFile);
        resolve();
      })
  }));
}

function generateOCRimages() {
  return new Promise((resolve, reject) => {
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

    let recognizePromises = [];

    // počkáme, až se všechny obrázky vygenerují
    Promise.all(sharpPromises)
      .then(() => {
        (async () => {
          // console.log('OCR obrázky vygenerovány');
          await recognizeOCRimages();
          resolve();
        })();
      })
  });
}

// --- Recognize přes tesseract ------------------------------------------------

function recognizeOCRimages() {
  return new Promise((resolve, reject) => {
    (async () => {

      const scheduler = createScheduler();
      const worker1 = createWorker();
      const worker2 = createWorker();

      // console.log("OCR čtení přes tesseract");

      let OCRjobs = [];

      await worker1.load();
      await worker2.load();

      // bylo původně eng
      await worker1.loadLanguage('digits-zlin');
      await worker2.loadLanguage('digits-zlin');
      await worker1.initialize('digits-zlin');
      await worker2.initialize('digits-zlin');

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

            let [, okres] = key.split(`/${khs}/`);
            [okres, ] = okres.split(".");

            if (OCRjson[okres] === undefined) {
              OCRjson[okres] = {};
            }

            OCRjson[okres] = {
              c: nemocni,
              h: uzdraveni,
              d: zemreli
            };
          }
        }
      }

      await scheduler.terminate(); // It also terminates all workers.

      await generateOCRjson().then(() => {
        resolve();
      })
    })();
  });
}

// --- Generování finálního json ------------------------------------------------
function generateOCRjson() {
  return new Promise((resolve, reject) => {
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
    })

    report(khs, "OK");
    resolve();
  });
}

module.exports = new Promise((resolve, reject) => {
  (async () => {
    const PDFfilePath = `out/${khs}.pdf`;

    const checkFileExists = false;

    // pokud již soubor existuje, nestahovat znovu, 
    // zrychluje proces, šetří KHS weby
    if (checkFileExists && fs.existsSync(PDFfilePath)) {
      report(khs, "PDF soubor byl nalezen, přeskakuji stahování");
      prepareOCRimage().then(()=> {
        resolve();
      });
    } else {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      // Vyhledání pdf souboru (url se každý den mění)
      await page.setViewport({ width: 1000, height: 1000});
      await page.goto('http://www.khszlin.cz/', {waitUntil: 'networkidle2'});

      // hledání url s pdf (každý den se URL mění)
      const [url, crawledTime] = await page.evaluate(() => {
        let names = document.querySelectorAll('.pdf');
        let arr = Array.prototype.slice.call(names);

        for (let i = 0; i < arr.length; i += 1) {
          if (arr[i].innerHTML.includes('Informace o výskytu koronaviru ve Zlínském kraji')) {
            return [arr[i].href, arr[i].innerHTML];
          }
        }
      });

      await browser.close();

      // čištění času
      // ukázka: "Hygienická stanice hlavního města Prahy informuje, 
      //    že v Praze je aktuálně celkem 4 003 potvrzených případů onemocnění
      //    covid-19.-● situace k 16.8.2020;18:00 hodin
      let [date,,time] = crawledTime.split("-");

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
      dateTime = `${tempDate} ${time}`;
      let ISODate = new Date(dateTime).toISOString();

      save('out/time.json', {
        "14": ISODate
      });

      // ukládání pdf -> generování obrázku
      const file = fs.createWriteStream(PDFfilePath);
      const request = http.get(url, function (response) {
        response.pipe(file);
        prepareOCRimage().then(()=> {
          resolve();
        });
      });      
    }
  })();
});