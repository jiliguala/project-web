'use strict';
/**
 * XSS过滤
 * @see: README.md
 * @see: https://en.wikipedia.org/wiki/Cross-site_scripting
 */
const xss = require('xss');
const url = require('url');
const server = require('@jlgl/orochi');
const safeConfig = require('./config');

const log = server.logger;

const xssConfig = safeConfig.xss || {};

//默认配置，删除不在白名单中的标签和属性
const DEFAULT_CONFIG = {
    stripIgnoreTag: true,
    stripIgnoreTagBody: true
};

/**
 * 用js-xss 对html过滤
 *
 * @param  {String} str  过滤前字符串
 * @return {String} str  过滤后字符串
 */
function filterHtml(str) {
    const xssObj = new xss.FilterXSS(DEFAULT_CONFIG);
    return xssObj.process(str);
}

exports.filterHtml = filterHtml;

/**
 * 参数过滤，对敏感字符进行转义
 *
 * @param {String} str        过滤前字符串
 * @return {object}
 *   - {Boolean} isMatched    是否匹配到敏感字符
 *   - {String}  value        过滤后的字符串
 *   - {String}  matchedChar  敏感字符
 */
function escapeParams(str) {
    let isMatched = false;
    let matchedChar = '';
    let replacedStr = str.trim(); // 去除前后空格
    replacedStr = str.replace(/[<>'"\\]/g, function(e) {
        isMatched = true;
        matchedChar = e;
        return '&#' + e.charCodeAt() + ';';
    });

    return {
        isMatched: isMatched,
        value: replacedStr,
        matchedChar: matchedChar
    };
}

exports.escapeParams = escapeParams;

/**
 * 判断是否是html结尾的参数名
 *
 * @param {String} param
 * @return         {Boolean}
 */
function isHtmlParam(param) {
    const REGEXP_HTML = /(HTML)$/i;
    return REGEXP_HTML.test(param);
}

/**
 * 重置路由参数
 * @param  {Object} req     请求对象
 * @param  {Object} ruleMap 规则索引
 */
function rebuildReq(req, rule) {
    // 过滤query
    Object.keys(req.query).forEach(function(key) {
        req.query[key] = rebuildParam(req.query[key], rule[key] || isHtmlParam(key));
    });
    // 过滤body
    if(Array.isArray(req.body)) {
        req.body.forEach(function(item, index) {
            Object.keys(item).forEach(function(key) {
                req.body[index][key] = rebuildParam(req.body[index][key], rule[key] || isHtmlParam(key));
            });
        });
    }
    else {
        Object.keys(req.body).forEach(function(key) {
            req.body[key] = rebuildParam(req.body[key], rule[key] || isHtmlParam(key));
        });
    }
}

/**
 * 重置参数
 * @param  {String} data [description]
 * @param  {String} rule [description]
 * @return {String}      [description]
 */
function rebuildParam(data, rule) {
    if (!data) return data;
    // Check array
    if (Array.isArray(data)) {
        return data.map(function(item) {
            return rebuildParam(item);
        });
    }
    switch (typeof data) {
    case 'object': {
        Object.keys(data).forEach((key) => {
            data[key] = rebuildParam(data[key]);
        });
    }
        break;
    case 'string': {
        // 重设规则匹配
        let ruleMatch = 'normal';
        if(rule === 'close') ruleMatch = 'close';
        else if(rule) ruleMatch = 'xss';
        switch(ruleMatch) {
        case 'xss':
            return filterHtml(data);
        case 'close':
            return data;
        default:
            return escapeParams(data).value;
        }
    }
    }
    return data;
}

/**
 * XSS过滤
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  返回对象
 * @param  {Function} next 下一步
 */
module.exports = function(req, res, next) {
    //过滤路由参数params
    if (req.url) {
        const pathname = url.parse(req.url).pathname; //获取req.url的路径，不包含query
        const decodePathname = decodeURI(pathname); //解码pathname
        const escapedParams = escapeParams(decodePathname); //转义字符
        if (escapedParams.isMatched) {
            log.warning('路由参数params xss过滤，出现不安全字符:' + escapedParams.matchedChar);
            let securityError = new Error('验证错误');
            securityError.status = 110;
            next(securityError);
            return;
        }
        req.url = encodeURI(escapedParams.value);
    }
    // 获取当前请求地址
    const curPath = req.originalUrl.split('?')[0].replace(/\/$/, '');
    const method = req.method.toLowerCase();
    let xssRule;
    // 检测在xss配置中是否有特例method
    if(xssConfig[method + ':' + curPath]) {
        xssRule = xssConfig[method + ':' + curPath];
    }
    // 检测是否有通用配置
    if(!xssRule && xssConfig[curPath]) {
        xssRule = xssConfig[curPath];
    }
    // 如果检测到关闭规则,则直接关闭检测
    if(xssRule === 'close') return next();
    // 重设请求对象
    rebuildReq(req, xssRule || {});
    return next();
};