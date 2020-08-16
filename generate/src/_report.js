module.exports = function (khs, message) {
  let khsIdentifier = khs.padEnd(12, ' ');
  khsIdentifier = `\x1b[36m${khsIdentifier}\x1b[0m`;

  console.log(khsIdentifier, message);
}