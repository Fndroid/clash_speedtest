## Clash Speedtest

基于`Speedtest.net`的Clash测速脚本（需要Nodejs环境）

### 安装及使用

1. Clone或下载本仓库代码
2. 在代码目录安装依赖

    ```
    npm install
    ```
3. 打开`index.js`文件，修改对应的外部控制器及测速时间

    ```
    const EC = "127.0.0.1:9090" // 外部控制器 External Controller
    const TIME = 15 // 测试时间，单位秒
    const PROXY = "http://127.0.0.1:7890" // Clash的Http代理
    ``` 
4. 切换至需要测速的配置文件（Clash）
5. 开始测试

    ```
    npm run speed
    ```

    ![控制台输出](https://github.com/Fndroid/clash_speedtest/blob/master/imgs/Snipaste_2019-02-07_16-41-50.png?raw=true)

### 结果查看

进入`output`文件夹，打开对应的Excel即可查看

![示例](https://github.com/Fndroid/clash_speedtest/blob/master/imgs/Snipaste_2019-02-07_16-42-17.png?raw=true)

### 依赖

[speedtest-net](https://github.com/ddsol/speedtest.net)

[moment](https://github.com/moment/moment)

[axios](https://github.com/axios/axios)

[node-xlsx](https://github.com/mgcrea/node-xlsx)
