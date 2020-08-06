const puppeteer = require('puppeteer');

const save = require('./_save');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 1200,
      height: 850
    });
    await page.goto('http://www.khsova.cz/', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.screenshot({
      path: 'out/07-khsova.png'
    });

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
        const pozitivni = null;
        const vyleceni = null;
        const umrti = null;
        const aktivni = null;
        const obyvatel = obyvatelstvo[okres];

        preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
      }
    }

    save('out/data.json', {
      "07": preparedData
    });

    await browser.close();
  })();
}