const http = require('http');
const fs = require('fs');

module.exports = function () {
  (async () => {

    const file = fs.createWriteStream("out/13-khsusti.pdf");
    const request = http.get("http://www.khsusti.cz/php/kousky/covid19/pocet_testovanych_osob_na_covid19_ustecky_kraj.pdf", function (response) {
      response.pipe(file);
    });
    
  })();
}