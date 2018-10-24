'use strict';
/**
 * CSRF过滤
 * @see: README.md
 * @see: https://en.wikipedia.org/wiki/Cross-site_request_forgery
 */
const sessionMid = require('../session');
const safeConfig = require('./config');
const csrfConfig = safeConfig.csrf || {};

/**
 * 判断当前是否为ajax请求
 * @param req
 * @return {boolean}
 */
function isAjaxRequest(req) {
    let requestType = req.headers['X-Requested-With'] || req.headers['x-requested-with'];
    let acceptType = req.headers['Accept'] || req.headers['accept'];
    return {
        result: requestType === 'XMLHttpRequest',
        needJson: requestType === 'XMLHttpRequest' && /application\/json/.test(acceptType)
    };
}

/**
 * 创建MD5
 * @param  {String} str 源值
 * @return {String}     结果信息
 */
function md5(str) {
    const md5sum = require('crypto').createHash('md5');
    md5sum.update(str);
    return md5sum.digest('hex');
}

/**
 * 设置CSRF token
 * @param  {Object}  req  请求对象
 * @param  {Object}  res  返回对象
 * @return {Object}       Promise对象
 */
function setCSRFToken(req, res) {
    // 生成token
    req.session._CSRF = md5(new Date().getTime().toString() + Math.round(Math.random() * 1000).toString());
    return new Promise(function(resolve, reject) {
        // 保存session
        sessionMid.save(req, res, function(err) {
            if(err) return reject(err);
            // 设置_CSRF token
            res.locals._CSRF = req.session._CSRF;
            resolve();
        });
    });
}

/**
 * 验证CSRF token
 * @param  {Object}  req  请求对象
 * @return {Object}       Promise对象
 */
function validCSRFToken(req) {
    const csrfToken = req.body._csrf || req.query._csrf || req.headers['csrf-token'] || req.headers['xsrf-token'] || req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    if(!csrfToken) {
        let err = new Error('不安全的提交数据');
        err.status = 110;
        return Promise.reject(err);
    }
    // 查询session中的数据是否一致
    if(req.session._CSRF !== csrfToken) {
        let err = new Error('无效的提交数据,请刷新页面重试');
        err.status = 110;
        return Promise.reject(err);
    }
    return Promise.resolve();
}

/**
 * CSRF检测
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  返回对象
 * @param  {Function} next 下一步
 */
module.exports = function(req, res, next) {
    const method = req.method.toLowerCase();
    // 获取当前请求地址
    const curPath = req.originalUrl.split('?')[0].replace(/\/$/, '');
    // 检测在csrf配置中是否有特例地址,如果有,则跳过
    if(csrfConfig[method + ':' + curPath] || csrfConfig[curPath]) return next();
    if(method === 'get') {
        // 如果是AJAX请求,跳过设置
        if(isAjaxRequest(req).result) return next();
        // 否则生成CSRF token
        return setCSRFToken(req, res)
            .then(next)
            .catch(next);
    }
    return validCSRFToken(req)
        .then(next)
        .catch(next);
};