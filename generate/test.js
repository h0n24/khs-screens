// const Tesseract = require('tesseract.js');

// Tesseract.recognize(
//     'https://www.khsplzen.cz/images/KHS/covid19/Plzensky_kraj.jpg',
//     'ces', {
//         logger: m => console.log(m)
//     }
// ).then(({
//     data: {
//         text
//     }
// }) => {
//     console.log(text);
// })

// 'use strict';
// const request = require('request');
// const fs = require('fs');
// const PNG = require('pngjs').PNG;
// const MY_COLOR = [60, 160, 80];
// request('https://www.khsplzen.cz/images/KHS/covid19/Plzensky_kraj.jpg').pipe(new PNG({
//     filterType: 4
// })).on('parsed', function () {
//     console.log(this);

//     for (var y = 0; y < this.height; y++) {
//         for (var x = 0; x < this.width; x++) {
//             var idx = (this.width * y + x) << 2;
//             this.data[idx + 0] = MY_COLOR[0];
//             this.data[idx + 1] = MY_COLOR[1];
//             this.data[idx + 2] = MY_COLOR[2];
//             this.data[idx + 3] = this.data[idx + 3];
//         }
//     }
//     // this.pack().pipe(fs.createWriteStream('result.png'));
// });

const sharp = require('sharp');
// const Tesseract = require('tesseract.js');

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

const okraj = true;
const okraj1 = okraj ? 1 : 0;
const okraj2 = okraj ? -2 : 0;

for (const pozice in OCRpozice) {
    if (OCRpozice.hasOwnProperty(pozice)) {
        const crop = OCRpozice[pozice];
        const saveToFile = `ocr/${pozice}.png`;

        // treshold 180 zbarví pixely pod 180 do černé, 
        // zbytek bílá
        sharp('out/10-khsplzen-ocr.png')
            .extract({
                left: crop[0] + okraj1,
                top: crop[1] + okraj1,
                width: crop[2] + okraj2,
                height: crop[3] + okraj2
            })
            .threshold(180)
            .toFile(saveToFile, function (err) {
                if (err) console.log(err);
                OCRurl.push(saveToFile);
                // OCRtesseract(saveToFile);
                // getTextFromImage(saveToFile).then(console.log)

                // console.log(OCRurl);
            })
    }
}



// import { createWorker } from 'tesseract.js';
const { createWorker } = require('tesseract.js');

const worker = createWorker({
  logger: m => console.log(m)
});

(async () => {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(OCRurl[0]);
  console.log(text);
  await worker.terminate();
})();

(async () => {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text2 } } = await worker.recognize(OCRurl[1]);
    console.log(text2);
    await worker.terminate();
  })();


// const { createWorker, createScheduler } = require('tesseract.js');

// const scheduler = createScheduler();
// const worker1 = createWorker();
// const worker2 = createWorker();

// (async () => {
//   await worker1.load();
//   await worker2.load();
//   await worker1.loadLanguage('eng');
//   await worker2.loadLanguage('eng');
//   await worker1.initialize('eng');
//   await worker2.initialize('eng');
//   scheduler.addWorker(worker1);
//   scheduler.addWorker(worker2);
//   /** Add 10 recognition jobs */
//   const results = await Promise.all(OCRurl.map(obj => {
//       console.log(obj);
//     scheduler.addJob('recognize', obj)
//   }))

//   console.log(results);
//   await scheduler.terminate(); // It also terminates all workers.
// })();

// -----------------------------------------------------------------------

// const { createWorker } = require('tesseract.js')
// const worker = createWorker()

// async function getTextFromImage(OCRfile) {
//     await worker.load()
//     await worker.loadLanguage('eng')
//     await worker.initialize('eng')
//     const { data: { text } } = await worker.recognize(OCRfile);
//     await worker.terminate()
    
//     return text
//   }

// getTextFromImage("ocr/4-c.png").then(console.log);


// const { createWorker } = require('tesseract.js');

// const worker = createWorker();

// (async () => {
//   await worker.load();
//   await worker.loadLanguage('eng');
//   await worker.initialize('eng');
//   const { data: { text } } = await worker.recognize('ocr/4-c.png');
//   console.log(text);
//   await worker.terminate();
// })();



// function OCRtesseract(OCRfile) {
//     console.log(OCRfile);
//     Tesseract.recognize(
//         OCRfile, 'eng', {
//             tessedit_char_whitelist: '0123456789'
//         }
//     ).then(({
//         data: {
//             text
//         }
//     }) => {
//         console.log(text);
//     })
// }

// -------------------------------

// sharp('out/10-khsplzen-ocr.png')
// .threshold(180)
// .toFile('out/10-khsplzen-ocr-bw.png', function (err) {
//     if (err) console.log(err);
// })

// const { createWorker, createScheduler } = require('tesseract.js');

// const scheduler = createScheduler();
// const worker1 = createWorker();
// const worker2 = createWorker();
// const rectangles = [
//   {
//     left: 116,
//     top: 282,
//     width: 55,
//     height: 36,
//   },
//   {
//     left: 172,
//     top: 282,
//     width: 55,
//     height: 36,
//   },
// ];

// (async () => {
//   await worker1.load();
//   await worker2.load();
//   await worker1.loadLanguage('eng');
//   await worker2.loadLanguage('eng');
//   await worker1.initialize('eng');
//   await worker2.initialize('eng');
//   scheduler.addWorker(worker1);
//   scheduler.addWorker(worker2);
//   const results = await Promise.all(rectangles.map((rectangle) => (
//     scheduler.addJob('recognize', 'out/10-khsplzen-ocr-bw.png', { rectangle })
//   )));
//   console.log(results.map(r => r.data.text));
//   await scheduler.terminate();
// })();