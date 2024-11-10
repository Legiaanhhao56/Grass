require('colors');

const delay = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function welcome() {
    process.stdout.write('\x1Bc');
    console.log('Dân Cày Airdrop'.cyan);
    console.log();
  }

module.exports = { delay, welcome };
