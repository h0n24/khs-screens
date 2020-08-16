module.exports = function (khs, message) {
  let parsedMessage = message.toString();
  let color = 36;

  // parsování chyb
  if (parsedMessage.includes(`ERR_INTERNET_DISCONNECTED`)) {
    parsedMessage = `ERR_INTERNET_DISCONNECTED`;
    color = 31;
  }

  if (parsedMessage.includes(`ERR_CONNECTION_TIMED_OUT`)) {
    parsedMessage = `ERR_CONNECTION_TIMED_OUT`;
    color = 31;
  }

  if (parsedMessage.includes(`ERR_CONNECTION_REFUSED`)) {
    parsedMessage = `ERR_CONNECTION_REFUSED`;
    color = 31;
  }

  if (parsedMessage.includes(`ERR_WORKING_WITH_OLD_DATA`)) {
    parsedMessage = `ERR_WORKING_WITH_OLD_DATA: smažte obsah složky out/. Data jsou příliš stará.`;
    color = 31;
  }

  // obarvení khs
  let khsIdentifier = khs.padEnd(12, ' ');
  khsIdentifier = `\x1b[${color}m${khsIdentifier}\x1b[0m`;

  // finální log
  if (color === 36) {
    console.log(khsIdentifier, parsedMessage);
  } else {
    console.error(khsIdentifier, parsedMessage);
  }
}