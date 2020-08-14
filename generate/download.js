// require
const fs = require('fs');
const path = require('path');

// výpis chyb & a nastavení max listeners na vyšší hodnotu (lepší paralelizace)
process.setMaxListeners(0);
process.on('uncaughtException', errorHappened);

function errorHappened(arg) {
  console.log(`Houston we have an error: ${arg}`)
}

// synchronní mazání obsahu složky out/, ať nenahráváme den stará data
const directory = 'out';

const files = fs.readdirSync(directory);
for (const file of files) {
  fs.unlink(path.join(directory, file), err => {
    if (err) throw err;
  });
}

// vytvořit základ pro datové js soubory
fs.writeFileSync('out/data.json', "[]");
fs.writeFileSync('out/time.json', "[]");
// fs.writeFileSync('out/errors.json', "[]");

// model dat:
// okres, pozitivni, vyleceni, umrti, aktivni, obyvatel

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

// todo
// exposeFunction pro clean