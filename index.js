const speedTest = require('speedtest-net');
// const speedTest = require('./speedtest/index')
require('draftlog').into(console)
const axios = require('axios')
const node_xlsx = require('node-xlsx')
const fs = require('fs')
const path = require('path')
const moment = require('moment')

const EC = "127.0.0.1:9090" // 外部控制器 External Controller
const TIME = 10 // 测试时间，单位秒
const PROXY = "http://127.0.0.1:7890" // Clash的http代理

let xlsx = node_xlsx.default

let startTesting = async (id) => {
  return new Promise((resolve, reject) => {
    var test = speedTest({ maxTime: TIME * 1000, serverId: id, proxy: PROXY });

    // test.on('data', data => {
    //   // console.log('data:', data)
    //   resolve(data)
    // });

    let tid = setTimeout(() => {
      resolve({ speeds: { download: '-', upload: '-' }, server: { ping: '-', country: '-' } });
    }, (10 + TIME) * 1000 );

    test.on('downloadspeed', speed => {
      clearTimeout(tid)
      resolve({ speeds: { download: (speed).toFixed(2), upload: '-' }, server: { ping: '-', country: '-' } });
    })

    test.on('error', err => {
      clearTimeout(tid)
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

function ProgressBar(done, sum, min) {
  let progress = done * 100 / sum
  // Make it 50 characters length
  var units = Math.round(progress / 2)
  return '[' + '='.repeat(units) + ' '.repeat(50 - units) + '] ' + done + '/' + sum + '  ' + min + ' min' + (min > 1 ? 's':'')
}

async function main() {
  console.log(`测速开始...`)
  if (await setMode("Global")) {
    console.log(`Clash成功切换至Global模式，请耐心等待测试完成...\n------------------------------------------------------`)
    let nodeList = (await getNodeList())
    let resultArr = [['Proxy', 'Download(Mbps)']]
    var barLine = console.draft('开始测试...')
    for (var i = 0; i < nodeList.length; i++) {
      if (await switchToNode(nodeList[i])) {
        // process.env["HTTP_PROXY"] = process.env["http_proxy"] = PROXY
        let result = { speeds: { download: '-', upload: '-' }, server: { ping: '-', country: '-' } }
        try {
          result = await startTesting(i)
        } catch(e) {
          // console.error(e.stack)
        }
        let timeLeft = (nodeList.length - 1 - i) * (TIME + 10) * 1000
        // console.log(`节点 ${nodeList[i]} 测试完成，剩余 ${nodeList.length - i - 1} 个待测节点，预计耗时 ${moment.duration(timeLeft).minutes() + 1} 分钟`)
        barLine(ProgressBar(i + 1, nodeList.length, moment.duration(timeLeft).minutes() + 1))
        resultArr.push([nodeList[i], result.speeds.download])
        // process.env["HTTP_PROXY"] = process.env["http_proxy"] = ""
      } else {
        // console.error('切换节点失败，跳过测试')
      }
    }
    const OPTIONS = { '!cols': [{ wch: 30 }, { wch: 15 }] };
    let xbuffer = xlsx.build([{ name: "result", data: resultArr }], OPTIONS)
    try {
      fs.mkdirSync('output')
    } catch (e) { }
    let fileName = moment().format("YYYY-MM-DD-HHmmss") + '.xlsx'
    fs.writeFileSync(path.join('output', fileName), xbuffer)
    console.log(`------------------------------------------------------\n* 测试结果已写入 output 文件夹，文件名为：${fileName}\n`)
  } else {
    console.log(`Clash外部控制器无法连接，请将在此文件顶部EC（默认：127.0.0.1:9090）字段改为对应的值！`)
  }
  console.log(`恢复为Rule模式${(await setMode("Rule")) ? '成功' : '失败'}`)
  console.log('测速完成...')
}

main().then(_ => { }).catch(e => console.error(e.stack))