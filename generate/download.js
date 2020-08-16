// require
const fs = require('fs');

const report = require('./src/_report');

// --- globální nastavení ------------------------------------------------------

// výpis chyb & a nastavení max listeners na vyšší hodnotu (lepší paralelizace)
process.setMaxListeners(0);
process.on('uncaughtException', errorHappened);

function errorHappened(arg) {
  let title = "Error".padEnd(12, ' ');
  title = `\x1b[31m${title}\x1b[0m`;
  console.log(title, arg);
}

function createNewFileOrSkip(file) {
  const dataFile = file;
  const [, shortFile] = file.split("/");
  // zjistíme pokud soubor existuje, jinak jej vytvoříme
  fs.access(dataFile, fs.constants.F_OK | fs.constants.W_OK, (err) => {
    if (err) {
      // console.error(`${dataFile} ${err.code === 'ENOENT' ? 'does not exist' : 'is read-only'}`);
      fs.writeFileSync(dataFile, "[]");
      // report(shortFile, "vytvořen");
    }
    else {
      // console.log(`${dataFile} exists, and it is writable`);
      report(shortFile, "existuje, updatuji data");
    }
  });
}

// --- vytvořit základ pro datové json soubory ---------------------------------
createNewFileOrSkip("out/data.json");
createNewFileOrSkip("out/time.json");
// createNewFileOrSkip("out/errors.json");


// --- zpracování jednotlivých dat ---------------------------------------------

console.log(""); // odsazení prvního řádku pro lepší čitelnost

// model dat:
// okres, pozitivni, vyleceni, umrti, aktivni, obyvatel

// jen pro test
require("./src/13-khsusti")();
return false;

// jednotlivé scripty pro khs
require("./src/01-khscb")();
require("./src/02-khsbrno")();
require("./src/03-khskv")();
require("./src/04-khsjih")();
require("./src/05-khshk")();
require("./src/06-khslbc")();
require("./src/07-khsova")();
require("./src/08-khsolc")();
require("./src/09-khspce")();
require("./src/10-khsplzen")();
require("./src/11-hygpraha")();
require("./src/12-khsstc")();
require("./src/13-khsusti")();
require("./src/14-khszlin")();

// todo ------------------------------------------------------------------------
// exposeFunction pro clean
// puppeteer - tor
// dopočítat některá data z oficiální API
// dodělat - porovnání s API z ministerstva

// isdown api? - kontrolovat favicony, případně podobně malé části
// https://api-prod.downfor.cloud/httpcheck/http://www.khsova.cz