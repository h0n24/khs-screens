const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');

const save = require('./_save');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 2400});
    await page.goto('https://www.khsplzen.cz/', {waitUntil: 'networkidle2'});

    // screenshot
    await page.evaluate( () => {
      window.scrollBy(0, 400);
    });

    await page.screenshot({path: 'out/10-khsplzen.png'});

    const file = fs.createWriteStream("out/10-khsplzen-ocr.png");
    const request = https.get("https://www.khsplzen.cz/images/KHS/covid19/Plzensky_kraj.jpg", function (response) {
      response.pipe(file);
    });

    file.on('finish', function () {
      // console.log("finished");
      onOcrFileDownloaded();
    });

    function onOcrFileDownloaded() {
      
    }

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
        const pozitivni = null;
        const vyleceni = null;
        const umrti = null;
        const aktivni = null;
        const obyvatel = obyvatelstvo[okres];

        preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
      }
    }

    save('out/data.json', {
      "10": preparedData
    });
  
    await browser.close();
  })();
}