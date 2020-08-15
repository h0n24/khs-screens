// require
const fs = require('fs');

console.log(""); // odsazení prvního řádku pro lepší čitelnost

// výpis chyb & a nastavení max listeners na vyšší hodnotu (lepší paralelizace)
process.setMaxListeners(0);
process.on('uncaughtException', errorHappened);

function errorHappened(arg) {
  console.log(`Houston we have an error: ${arg}`)
}

// vytvořit základ pro datové js soubory
fs.writeFileSync('out/data.json', "[]");
fs.writeFileSync('out/time.json', "[]");
// fs.writeFileSync('out/errors.json', "[]");

// model dat:
// okres, pozitivni, vyleceni, umrti, aktivni, obyvatel

// jen pro test
// require("./khs/07-khsova")();
// return false;

// jednotlivé scripty pro khs
require("./khs/01-khscb")();
require("./khs/02-khsbrno")();
require("./khs/03-khskv")();
require("./khs/04-khsjih")();
require("./khs/05-khshk")();
require("./khs/06-khslbc")();
require("./khs/07-khsova")();
require("./khs/08-khsolc")();
require("./khs/09-khspce")();
require("./khs/10-khsplzen")();
require("./khs/11-hygpraha")();
require("./khs/12-khsstc")();
require("./khs/13-khsusti")();
require("./khs/14-khszlin")();

// todo ------------------------------------------------------------------------
// exposeFunction pro clean
// puppeteer - tor
// dopočítat některá data z oficiální API
// dodělat - porovnání s API z ministerstva

// isdown api? - kontrolovat favicony, případně podobně malé části
// https://api-prod.downfor.cloud/httpcheck/http://www.khsova.cz

// khskv - stahovat přímo json místo obrázku
// khsstc - stahovat přímo json místo obrázku