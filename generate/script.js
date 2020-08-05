const fs = require('fs');
fs.writeFileSync('out/data.json', "[]");
fs.writeFileSync('out/errors.json', "[]");

// model dat:
// okres - případů - vyléčených - zemřelých - obyvatel

require("./khs/01-khscb")();
// require("./khs/02-khsbrno")();
require("./khs/03-khskv")();
// require("./khs/04-khsjih")();
// require("./khs/05-khshk")();
// require("./khs/06-khslbc")();
// require("./khs/07-khsova")();
// require("./khs/08-khsolc")();
// require("./khs/09-khspce")();
// require("./khs/10-khsplzen")();
// require("./khs/11-hygpraha")();
require("./khs/12-khsstc")();
// require("./khs/13-khsusti")();
// require("./khs/14-khszlin")();