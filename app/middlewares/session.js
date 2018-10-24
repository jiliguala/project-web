'use strict';
const crypto = require('crypto');
const uid = require('uid');
const server = require('@jlgl/orochi');
const config = server.config;
const log = server.logger;

const sessionOpts = config.session || {};
const sessionIdKeyPrefix = sessionOpts.prefix || 'session-'; // session key的前缀
const sessionSecret = sessionOpts.secret || uid(); // 创建密钥
const sessionCookieKey = sessionOpts.cookieKey || 'orochi-session'; // session的cookie key
const redisExpire = sessionOpts.redisExpire || 30 * 60; // 默认30分钟

/**
 * 创建签名
 * @param  {String} val    源值
 * @param  {String} secret 密钥
 * @return {String}        签名
 */
function sign(val, secret) {
    return val + '.' + crypto
        .createHmac('sha256', secret)
        .update(val)
        .digest('base64')
        .replace(/[/+=]/g, '');
}

/**
 * 创建session对象
 * @param  {String} id session ID
 * @return {Object}    session对象
 */
function generate(id) {
    let session = {};
    if (id) {
        session.id = id;
    } else {
        session.id = (new Date()).getTime() + uid(18);
        session.id = sessionIdKeyPrefix + sign(session.id, sessionSecret);
    }
    return session;
}

/**
 * 序列化session cookie内容
 * @param  {Object} opt 配置文件
 * @return {Object}     序列化后的结果
 */
function serialize(opt) {
    let options = {
        httpOnly: true
    };
    if(opt.maxAge) options.maxAge = opt.maxAge;
    if(opt.domain) options.domain = opt.domain;
    if(opt.path) options.path = opt.path;
    if(opt.secure) options.secure = opt.secure;
    return options;
}

/**
 * 创建cookie写入头
 * @param  {Object} req 请求对象
 * @param  {Object} res 返回对象
 */
function writeHead(req, res) {
    res.cookie(sessionCookieKey, req.session.id, serialize(sessionOpts));
}

/**
 * 初始化session
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  返回对象
 * @param  {Function} next 下一步
 */
exports.init = function (req, res, next) {
    let id = req.cookies[sessionCookieKey];
    if (!id) {
        req.session = generate();
        next();
    } else {
        server.getCacheClient().get(id)
            .then(function(reply) {
                if(reply) {
                    let session = JSON.parse(reply);
                    req.session = session;
                    // 是否需要刷新cookie
                    if(sessionOpts.refresh) writeHead(req, res);
                } else {
                    req.session = generate();
                    res.clearCookie(sessionCookieKey);
                }
                next();
            })
            .catch(function(err) {
                log.error(err);
                req.session = generate();
                next();
            });
    }
};

/**
 * 保存session
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  返回对象
 * @param  {Function} next 下一步
 */
exports.save = function (req, res, next) {
    let id = req.session.id;
    if (!id) {
        if (next) {
            return next();
        }
    }
    let json = JSON.stringify(req.session);
    server.getCacheClient().set(id, json, 'EX', redisExpire)
        .then(function() {
            writeHead(req, res);
            next();
        })
        .catch(function(err) {
            log.error(err);
            next();
        });
};

/**
 * 清除session
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  返回对象
 * @param  {Function} next 下一步
 */
exports.clear = function (req, res, next) {
    let id = req.cookies[sessionCookieKey];
    if (!id) {
        return next();
    }
    server.getCacheClient().del(id)
        .then(function() {
            res.clearCookie(sessionCookieKey);
            next();
        })
        .catch(function(err) {
            log.error(err);
            next();
        });
};