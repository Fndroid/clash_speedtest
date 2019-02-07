const speedTest = require('speedtest-net');
const axios = require('axios')
const node_xlsx = require('node-xlsx')
const fs = require('fs')
const path = require('path')
const moment = require('moment')

const EC = "127.0.0.1:9090" // 外部控制器 External Controller
const TIME = 15 // 测试时间，单位秒

let xlsx = node_xlsx.default

let startTesting = async (id) => {
  return new Promise((resolve, reject) => {
    var test = speedTest({ maxTime: TIME * 1000, serverId: id });

    test.on('data', data => {
      resolve(data)
    });

    test.on('error', err => {
      // console.log('err:', err)
      resolve({ speeds: { download: '-', upload: '-' }, server: { ping: '-', country: '-' } });
    });
  })
}

let getNodeList = async () => {
  let res = []
  try {
    let resp = await axios.get(`http://${EC}/proxies`)
    if (resp.status === 200) {
      let proxies = resp.data.proxies
      res = Object.keys(proxies).filter(i => {
        return proxies[i].type === 'Shadowsocks' || proxies[i].type === 'Vmess'
      })
    }
  } catch (e) {

  }
  return res
}

let setMode = async (mode) => {
  try {
    let resp = await axios.patch(`http://${EC}/configs`, { mode: mode })
    return resp.status === 204
  } catch (e) {
    return false
  }
}

let switchToNode = async (node) => {
  try {
    let resp = await axios.put(`http://${EC}/proxies/GLOBAL`, { name: node })
    return resp.status === 204
  } catch (e) {
    // console.error(e.stack)
    return false
  }
}

async function main() {
  console.log(`测速开始...`)
  if (await setMode("Global")) {
    console.log(`Clash成功切换至Global模式，请耐心等待测试完成...\n------------------------------------------------------\n`)
    let nodeList = (await getNodeList())
    let resultArr = [['Proxy', 'Ping(ms)', 'Country', 'Upload(Mbps)', 'Download(Mbps)']]
    for (var i = 0; i < nodeList.length; i++) {
      if (await switchToNode(nodeList[i])) {
        let result = await startTesting(i)
        let timeLeft = (nodeList.length - 1 - i) * TIME * 1000
        console.log(`节点 ${nodeList[i]} 测试完成，剩余 ${nodeList.length - i - 1} 个待测节点，预计耗时 ${moment.duration(timeLeft).minutes() + 1} 分钟`)
        resultArr.push([nodeList[i], result.server.ping, result.server.country, result.speeds.upload, result.speeds.download])
      } else {
        console.error('切换节点失败，跳过测试')
      }
    }
    const OPTIONS = { '!cols': [{ wch: 20 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }] };
    let xbuffer = xlsx.build([{ name: "result", data: resultArr }], OPTIONS)
    try {
      fs.mkdirSync('output')
    } catch (e) { }
    let fileName = moment().format("YYYY-MM-DD-HHmmss") + '.xlsx'
    fs.writeFileSync(path.join('output', fileName), xbuffer)
    console.log(`\n------------------------------------------------------\n* 测试结果已写入 output 文件夹，文件名为：${fileName}\n`)
  } else {
    console.log(`Clash外部控制器无法连接，请将在此文件顶部EC（默认：127.0.0.1:9090）字段改为对应的值！`)
  }
  console.log(`恢复为Rule模式${(await setMode("Rule")) ? '成功':'失败'}`)
  console.log('测速完成...')
}

main().then(_ => { })