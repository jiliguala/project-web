'use strict';
const server = require('@jlgl/orochi');
const config = server.config;
let map = {};
let mapListStr = '';
const fs = require('fs');
const path = require('path');
const configPath = path.join(server.appDir, '/app/public/config/');

const log = server.logger;
let mapVersion = new Date().getTime();

/**
 * 获取map数据
 */
function getNodes() {
    let mapList = [];
    // 读取所有文件夹下内容
    if(fs.existsSync(configPath)) {
        const files = fs.readdirSync(configPath);
        for (let i in files) {
            const filename = files[i];
            Object.assign(map, JSON.parse(fs.readFileSync(path.join(configPath, filename)).toString()));
        }
    }else {
        log.info('无效的资源配置信息,已略过');
    }
    for(let key in map) {
        const pathInfo = getNodeByName(key);
        mapList.push([key, pathInfo.uri]);
    }
    mapListStr = JSON.stringify(mapList);
}

/**
 * 通过名称查找资源信息
 * @param  {String} name 资源名称
 * @return {Object}      资源信息
 */
function getNodeByName(name) {
    //如果是非缓存模式,则每次重读map文件
    if(!config.templateCache && new Date().getTime() - mapVersion > 1000) {
        mapVersion = new Date().getTime(); //重写版本
        getNodes();
    }
    let pathInfo = map[name] || {};
    while(pathInfo.source) {
        if(pathInfo.source) {
            pathInfo = map[pathInfo.source];
        }else {
            pathInfo = {};
        }
    }
    return pathInfo;
}

exports.getNodes = getNodes;
exports.getNodeByName = getNodeByName;
exports.getInfo = function() {
    return {
        list: mapListStr,
        version: mapVersion
    };
};