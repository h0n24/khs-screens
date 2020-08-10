const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');

const save = require('./_save');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000});
    await page.goto('http://www.khszlin.cz/', {waitUntil: 'networkidle2'});

    // hledání url s pdf (každý den se URL mění)
    const url = await page.evaluate(() => {
      let names = document.querySelectorAll('.pdf');
      let arr = Array.prototype.slice.call(names);
      for (let i = 0; i < arr.length; i += 1) {

        if (arr[i].innerHTML.includes('Informace o výskytu koronaviru ve Zlínském kraji')) {
          return arr[i].href;
        }
      }
    });

    // ukládání pdf
    const file = fs.createWriteStream("out/14-khszlin.pdf");
    const request = http.get(url, function (response) {
      response.pipe(file);
    });

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
        const pozitivni = null;
        const vyleceni = null;
        const umrti = null;
        const aktivni = null;
        const obyvatel = obyvatelstvo[okres];

        preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
      }
    }

    save('out/data.json', {
      "14": preparedData
    });
  
    await browser.close();
  })();
}