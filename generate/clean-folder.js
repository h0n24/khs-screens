// require
const fs = require('fs');
const path = require('path');

// synchronní mazání obsahu složky out/, ať nenahráváme den stará data
const directory = 'out';

const files = fs.readdirSync(directory);
for (const file of files) {
  fs.unlink(path.join(directory, file), err => {
    if (err) throw err;
  });
}

// uloží, kdy byla složka smazána naposledy
const date = new Date();
const dateIso = date.toISOString();

fs.writeFileSync("out/first.json", `["${dateIso}"]`);