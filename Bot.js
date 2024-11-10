require('colors');
const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

class Bot {
  constructor(config) {
    this.config = config;
  }

  async getProxyIP(proxy) {
    const agent = proxy.startsWith('http')
      ? new HttpsProxyAgent(proxy)
      : new SocksProxyAgent(proxy);
    try {
      const response = await axios.get(this.config.ipCheckURL, {
        httpsAgent: agent,
      });
      console.log(`Đã kết nối proxy ${proxy}`.green);
      return response.data;
    } catch (error) {
      console.error(
        `Bỏ qua proxy ${proxy} do lỗi kết nối: ${error.message}`
          .yellow
      );
      return null;
    }
  }

  async connectToProxy(proxy, userID) {
    const formattedProxy = proxy.startsWith('socks5://')
      ? proxy
      : proxy.startsWith('http')
      ? proxy
      : `socks5://${proxy}`;
    const proxyInfo = await this.getProxyIP(formattedProxy);

    if (!proxyInfo) {
      return;
    }

    try {
      const agent = formattedProxy.startsWith('http')
        ? new HttpsProxyAgent(formattedProxy)
        : new SocksProxyAgent(formattedProxy);
      
      const wsURL = `wss://${this.config.wssHost}`;
      const ws = new WebSocket(wsURL, {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0',
          'Pragma': 'no-cache',
          'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache'
        }
      });

      ws.on('open', () => {
        console.log(`Proxy ${proxyInfo.ip} - ${proxyInfo.city} (${proxyInfo.country})`.magenta);
        this.sendPing(ws, proxyInfo.ip);
      });

      ws.on('message', (message) => {
        const msg = JSON.parse(message);
        
        if (msg.action === 'AUTH') {
          console.log(`Nhận auth với id: ${msg.id}`.blue);
          const authResponse = {
            id: msg.id,
            origin_action: 'AUTH',
            result: {
              browser_id: uuidv4(),
              user_id: userID,
              user_agent: 'Mozilla/5.0',
              timestamp: Math.floor(Date.now() / 1000),
              device_type: 'desktop',
              version: '4.28.1',
            },
          };
          ws.send(JSON.stringify(authResponse));
          console.log(`Gửi yêu cầu đăng nhập`.green);
        } else if (msg.action === 'PONG') {
          console.log(`Server trả về PONG id: ${msg.id}`.blue);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`Ngắt kết nối với mã: ${code}, reason: ${reason}`.yellow);
        setTimeout(
          () => this.connectToProxy(proxy, userID),
          this.config.retryInterval
        );
      });

      ws.on('error', (error) => {
        console.error(`Lỗi WebSocket ${proxy}: ${error.message}`.red);
        ws.terminate();
      });
    } catch (error) {
      console.error(`Không thể đăng nhập với proxy ${proxy}: ${error.message}`.red);
    }
  }

  async connectDirectly(userID) {
    try {
      const wsURL = `wss://${this.config.wssHost}`;
      const ws = new WebSocket(wsURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0',
          'Pragma': 'no-cache',
          'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache'
        }
      });

      ws.on('open', () => {
        console.log(`Kết nối không cần proxy`.cyan);
        this.sendPing(ws, 'Direct IP');
      });

      ws.on('message', (message) => {
        const msg = JSON.parse(message);
        
        if (msg.action === 'AUTH') {
          console.log(`Nhận auth với id: ${msg.id}`.blue);
          const authResponse = {
            id: msg.id,
            origin_action: 'AUTH',
            result: {
              browser_id: uuidv4(),
              user_id: userID,
              user_agent: 'Mozilla/5.0',
              timestamp: Math.floor(Date.now() / 1000),
              device_type: 'desktop',
              version: '4.28.1',
            },
          };
          ws.send(JSON.stringify(authResponse));
          console.log(`Gửi yêu cầu đăng nhập`.green);
        } else if (msg.action === 'PONG') {
          console.log(`Server trả về PONG id: ${msg.id}`.blue);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`Ngắt kết nối: ${code}, reason: ${reason}`.yellow);
        setTimeout(
          () => this.connectDirectly(userID),
          this.config.retryInterval
        );
      });

      ws.on('error', (error) => {
        console.error(`Lỗi rồi: ${error.message}`.red);
        ws.terminate();
      });
    } catch (error) {
      console.error(`Không thể đăng nhập: ${error.message}`.red);
    }
  }

  sendPing(ws, proxyIP) {
    setInterval(() => {
      const pingId = uuidv4();
      const pingMessage = {
        id: pingId,
        version: '1.0.0',
        action: 'PING',
        data: {},
      };
      ws.send(JSON.stringify(pingMessage));
      console.log(`Gửi Ping tới server với id ${pingId} | ip: ${proxyIP}`.cyan);
    }, 26000);
  }
}

module.exports = Bot;