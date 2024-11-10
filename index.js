require('colors');
const inquirer = require('inquirer');
const Bot = require('./src/Bot');
const Config = require('./src/Config');
const {
  fetchProxies,
  readLines,
  selectProxySource,
} = require('./src/ProxyManager');
const { delay, welcome } = require('./src/utils');

async function main() {
  welcome();
  console.log(`Vui Lòng Chờ...\n`.yellow);

  await delay(1000);

  const config = new Config();
  const bot = new Bot(config);

  const proxySource = await selectProxySource(inquirer);

  let proxies = [];
  if (proxySource.type === 'file') {
    proxies = await readLines(proxySource.source);
  } else if (proxySource.type === 'url') {
    proxies = await fetchProxies(proxySource.source);
  } else if (proxySource.type === 'none') {
    console.log('Không có proxy nào được chọn. Kết nối trực tiếp.'.cyan);
  }

  if (proxySource.type !== 'none' && proxies.length === 0) {
    console.error('Không tìm thấy proxy. Đang thoát...'.red);
    return;
  }

  console.log(
    proxySource.type !== 'none'
      ? `Tìm thấy ${proxies.length} proxy`.green
      : 'Bật chế độ noproxy'.green
  );

  const userIDs = await readLines('data.txt');
  if (userIDs.length === 0) {
    console.error('Không tìm thấy ID người dùng nào trong data.txt. Đang thoát...'.red);
    return;
  }

  console.log(`Tìm thấy ${userIDs.length} tài khoản\n`.green);

  const connectionPromises = userIDs.flatMap((userID) =>
    proxySource.type !== 'none'
      ? proxies.map((proxy) => bot.connectToProxy(proxy, userID))
      : [bot.connectDirectly(userID)]
  );

  await Promise.all(connectionPromises);
}

main().catch(console.error);

