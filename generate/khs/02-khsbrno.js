const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const {
  PdfReader
} = require('pdfreader');

const save = require('./_save');
const clean = require('./_clean');

module.exports = function () {
  (async () => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 400,
      height: 1200
    });
    await page.goto('https://www.khsbrno.cz/', {
      waitUntil: 'networkidle2'
    });

    // normalní screen
    await page.screenshot({
      path: 'out/02-khsbrno.png'
    });

    // hledání posledního pdf
    const url = await page.evaluate(() => {
      let names = document.querySelectorAll('.zvyrazneni_radku');
      let arr = Array.prototype.slice.call(names);
      for (let i = 0; i < arr.length; i += 1) {

        let link = arr[i].querySelector("a");

        if (link.innerHTML.includes('Aktuální epidemiologická situace v Jihomoravském kraji - COVID-19')) {
          return link.href;
        }
      }
    });

    // stahování pdf
    if (url) {
      const file = fs.createWriteStream("out/02-khsbrno.pdf");
      const request = https.get(url, function (response) {
        response.pipe(file);
      });

      file.on('finish', function () {
        // console.log("finished");
        onPdfSavedToDisk();
      });
    }

    // // čtení pdf
    function onPdfSavedToDisk() {
      let okresY = [];
      let osaX = [];
      let pdfData = new Array(7);

      function pdfParsePrepareYAxis(item) {
        if (item.text === "Brno-město") {
          okresY[0] = item.y;
        }

        if (item.text === "Brno-venkov") {
          okresY[1] = item.y;
        }

        if (item.text === "Blansko") {
          okresY[2] = item.y;
        }

        if (item.text === "Břeclav") {
          okresY[3] = item.y;
        }

        if (item.text === "Hodonín") {
          okresY[4] = item.y;
        }

        if (item.text === "Vyškov") {
          okresY[5] = item.y;
        }

        if (item.text === "Znojmo") {
          okresY[6] = item.y;
        }
      }

      function pdfParse(item) {
        pdfParsePrepareYAxis(item);

        // popis osy x
        if (item.y === okresY[0]) {
          osaX.push(Math.round(item.x));
        }

        for (let index = 0; index < okresY.length; index++) {
          const osaY = okresY[index];
          if (item.y === osaY) {
            // console.log(item);

            if (pdfData[index] === undefined) {
              pdfData[index] = [];
            }

            // musíme nalézt pozici vůči tabulky (sloupec)
            let poziceX;
            for (let indexX = 0; indexX < osaX.length; indexX++) {
              const tempX = osaX[indexX];
              const tempItemX = Math.round(item.x);

              // bohužel se nedají porovnávat přímo, někdy jsou menší či větší
              if (tempX === tempItemX) {
                poziceX = indexX;
              } else if (tempX === tempItemX + 1) {
                poziceX = indexX;
              } else if (tempX === tempItemX - 1) {
                poziceX = indexX;
              }
            }

            // testing purposes only: Math.round(item.x)
            pdfData[index].push([poziceX, item.text]);
          }
        }
      }

      function afterPdfParse(pdfData) {
        // zpracování dat
        const obyvatelstvo = {
          "Brno-město": 381346,
          "Brno-venkov": 224642,
          "Blansko": 109136,
          "Břeclav": 116291,
          "Hodonín": 153943,
          "Vyškov": 92280,
          "Znojmo": 114351
        };

        let preparedData = [];

        for (let index = 0; index < pdfData.length; index++) {
          const rowData = pdfData[index];
          const okres = rowData[0][1];
          const pozitivni = clean.number(rowData[1][1]);
          const vyleceni = clean.number(rowData[2][1]);
          const obyvatel = obyvatelstvo[okres];

          let umrti = 0;
          if (rowData[3][0] === 3) {
            umrti = clean.number(rowData[3][1]);
          }

          let aktivni = null;
          if (rowData[rowData.length - 1][0] === 5) {
            aktivni = clean.number(rowData[rowData.length - 1][1]);
          }

          preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
        }

        save('out/data.json', {
          "02": preparedData
        });
      }

      new PdfReader().parseFileItems("out/02-khsbrno.pdf", function (err, item) {
        if (err) {
          console.error(err);
        } else if (!item) {
          /* pdfreader queues up the items in the PDF and passes them to
           * the callback. When no item is passed, it's indicating that
           * we're done reading the PDF. */
          // console.log('Done.');
          afterPdfParse(pdfData);
        } else if (item.file) {
          // File items only reference the PDF's file path.
          // console.log(`Parsing ${item.file && item.file.path || 'a buffer'}`)
        } else if (item.page) {
          // Page items simply contain their page number.
          // console.log(`Reached page ${item.page}`);
        } else if (item.text) {
          // Goes through every item in the pdf file
          pdfParse(item);
        }
      });
    }

    await browser.close();
  })();
}