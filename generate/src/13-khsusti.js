const http = require('http');
const fs = require('fs');
const {
  PdfReader
} = require('pdfreader');

const save = require('./_save');
const clean = require('./_clean');
const report = require('./_report');

const khs = "13-khsusti";

module.exports = function () {
  (async () => {

    const file = fs.createWriteStream("out/13-khsusti.pdf");
    const request = http.get("http://www.khsusti.cz/php/kousky/covid19/pocet_testovanych_osob_na_covid19_ustecky_kraj.pdf", function (response) {
      response.pipe(file);
    });

    file.on('finish', function () {
      // console.log("finished");
      onPdfSavedToDisk();
    });

    // čtení pdf
    function onPdfSavedToDisk() {
      let pdfData;
      let pdfDataAsText = "";

      function pdfParse(item) {
        // bohužel pozice jednotlivých elementů v pdf se různí, proto je třeba vše převést na jeden dlouhý string
        pdfDataAsText = pdfDataAsText + "//" + item.text;
      }

      function pdfDecode(pdfDataAsText) {
        // console.log(pdfDataAsText);
        // rozdělení 
        let subStringDataZprava = pdfDataAsText.split("//D//ěč//ín");
        [,subStringDataZprava] = subStringDataZprava;
        let subStringDataZleva = subStringDataZprava.split("//CELKEM //");
        [subStringDataZleva,] = subStringDataZleva;

        let stringTabulka = subStringDataZleva;

        // oprava měst ---------
        // odstraněný Děčín
        stringTabulka = "Děčín" + stringTabulka;
        
        // rozdělené Litoměřice a Ústí
        stringTabulka = stringTabulka.replace("Litom//ěř//ice","Litoměřice");
        stringTabulka = stringTabulka.replace("Ústí nad //Labem","Ústí nad Labem");
        
        // příprava na split podle měst
        stringTabulka = stringTabulka.replace("//Chomutov","///Chomutov");
        stringTabulka = stringTabulka.replace("//Most","///Most");
        stringTabulka = stringTabulka.replace("//Litoměřice","///Litoměřice");
        stringTabulka = stringTabulka.replace("//Louny","///Louny");
        stringTabulka = stringTabulka.replace("//Teplice","///Teplice");
        stringTabulka = stringTabulka.replace("//Ústí nad Labem","///Ústí nad Labem");
        
        // split dle měst a dat
        let tabulka = stringTabulka.split("///");

        for (let index = 0; index < tabulka.length; index++) {
          const element = tabulka[index];
          tabulka[index] = tabulka[index].split("//");
        }

        pdfData = tabulka;
      }

      function afterPdfParse(pdfDataAsText) {
        // zpracování dat
        const obyvatelstvo = {
          "Děčín": 129542,
          "Chomutov": 124946,
          "Most": 111708,
          "Litoměřice": 119668,
          "Louny": 86691,
          "Teplice": 129072,
          "Ústí nad Labem": 119338
        };

        pdfDecode(pdfDataAsText);

        let preparedData = [];

        for (let index = 0; index < pdfData.length; index++) {
          const rowData = pdfData[index];
          const okres = rowData[0].trim();
          const pozitivni = clean.number(rowData[1]);
          const vyleceni = clean.number(rowData[2]);
          const aktivni = clean.number(rowData[3]);
          const umrti = clean.number(rowData[4]);
          const obyvatel = obyvatelstvo[okres];

          // console.log([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
          preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
        }

        save('out/data.json', {
          "13": preparedData
        });

        report(khs, "OK");
      }

      new PdfReader().parseFileItems("out/13-khsusti.pdf", function (err, item) {
        if (err) {
          console.error(err);
        } else if (!item) {
          /* pdfreader queues up the items in the PDF and passes them to
           * the callback. When no item is passed, it's indicating that
           * we're done reading the PDF. */
          // console.log('Done.');
          afterPdfParse(pdfDataAsText);
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
    
  })();
}