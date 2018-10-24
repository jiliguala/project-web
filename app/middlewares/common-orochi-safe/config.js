'use strict';
/**
 * 安全配置查询
 */
const server = require('@jlgl/orochi');
const path = require('path');
const fs = require('fs');

const log = server.logger;

// 读取安全配置文件地址
const safeFilePath = path.join(server.appDir, 'safe.json');
let safeConfig = {};
if(fs.existsSync(safeFilePath)) {
    safeConfig = require(safeFilePath);
}else {
    log.debug('没有安全配置文件,已忽略');
}

module.exports = safeConfig;