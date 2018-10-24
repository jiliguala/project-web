'use strict';
const mapMod = require('../modules/map');

mapMod.getNodes();

/**
 * 获取handlebars includeMap对象
 * @param  {Object} context 上下文对象
 * @return {Object}         includeMap对象
 */
function getIncludeMap(context) {
    return context.$$includeMap || (
        context.$$includeMap = {}
    );
}

/**
 * 静态资源使用方法
 */
module.exports = function (handlebars) {
    return {
        'mapUse': function(resource, options) {
            options = options || {};
            const fn = options.fn;
            const context = this || {};
            const includeMap = getIncludeMap(context); //获取索引数据
            // 如果有执行函数,则直接输出当前所有的列表数据
            // @param {Array} list
            // @param {String} name
            // @param {String} html
            if(fn) {
                const data = handlebars.createFrame(options.data); //构造数据
                const type = resource || 'js';
                if(!includeMap[type] || includeMap[type].length === 0) return '';
                // 构造数据
                data.list = includeMap[type]; //资源索引数组
                data.listNameStr = []; //资源索引数组
                data.localStr = []; //本地资源列表
                data.onlineStr = []; //在线资源列表
                data.list.forEach(function(item) {
                    // 如果是本地资源,则写入本地索引及列表
                    if(item.status === 'local') {
                        data.localStr.push(item.uri);
                    }
                    else data.onlineStr.push(item.path);
                    data.listNameStr.push(item.name); //列表重组
                });
                data.listNameStr = data.listNameStr.length > 0 ? JSON.stringify(data.listNameStr).replace(/"/g, '\'').replace(/,/g, ', ') : '';
                data.localStr = data.localStr.toString();
                data.onlineStr = data.onlineStr.toString();
                // 编译函数
                return fn(context, {
                    data: data
                });
            }
            // 构建索引列表
            const pathInfo = Object.assign({}, mapMod.getNodeByName(resource));
            // 如果有该文件
            if(pathInfo.uri) {
                pathInfo.name = resource; // 写入名称
                const uriRe = /^(http[s]*:|)\/\/[^/]+\//;
                // 判断是在线资源还是线下资源,并记录
                if(uriRe.test(pathInfo.uri)) {
                    pathInfo.status = 'online';
                    pathInfo.path = pathInfo.uri.replace(uriRe, '/');
                }else {
                    pathInfo.status = 'local';
                }
                // 检测是否存在
                if(!includeMap[pathInfo.type]) includeMap[pathInfo.type] = [pathInfo];
                // 否则,查询滤重
                else {
                    if(includeMap[pathInfo.type].every(function(item) {
                        return item.name !== resource;
                    })) includeMap[pathInfo.type].push(pathInfo);
                }
            }
            return '';
        },
        'mapConfig': function() {
            const mapInfo = mapMod.getInfo();
            return `<script src="/static/map/config/?${mapInfo.version}"></script>`;
        },
        'mapNode': function(resource) {
            const pathInfo = mapMod.getNodeByName(resource);
            return pathInfo.uri;
        }
    };
};