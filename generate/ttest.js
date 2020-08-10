

const sharp = require('sharp');

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
  for (const pozice in OCRpozice) {
    if (OCRpozice.hasOwnProperty(pozice)) {
      const crop = OCRpozice[pozice];
      const saveToFile = `ocr/${pozice}.png`;
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

const { createWorker, createScheduler } = require('tesseract.js');

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
        const number = parseInt(text, 10);

        let [ okres, sub ] = key.split("-");
        [,okres] = okres.split("/");
        [sub,] = sub.split(".");

        if (OCRjson[okres] === undefined) {
          OCRjson[okres] = [];
        }
        OCRjson[okres].push({[sub]: number});
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