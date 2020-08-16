exports.number = function(string) {
  let cleanNumber = string.replace(/[^0-9]/g, '');
  cleanNumber = parseInt(cleanNumber, 10);
  return cleanNumber;
};