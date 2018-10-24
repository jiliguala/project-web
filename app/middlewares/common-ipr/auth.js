'use strict';
/**
 * 获取用户数据
 */
const server = require('@jlgl/orochi');
const projectName = server.projectName;
const sessionApi = require('@dubbo/session-manager-north-api');

const sessionMid = require('../session');
const toolMod = require('../../modules/tool');

const config = server.config;
const log = server.logger;
const authConfig = config.auth || {};

/**
 * 发送错误信息
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  响应对象
 * @param  {Function} next 下一步函数
 */
function postError(req, res, next) {
    const isAjax = toolMod.isAjaxRequest(req);
    if(isAjax.result) {
        let error = new Error('请登录再进行操作');
        error.code = 401;
        return next(error);
    }
    let url = 'https://' + req.headers.host + req.originalUrl;
    let authURI = config.baseURI;
    if(authConfig.URI) {
        authURI = authConfig.URI;
    }
    // 检测配置
    if(config.crossDomain) return res.redirect(`https://token.${authURI}/?url=${encodeURIComponent(url)}`);
    else return res.redirect(`https://login.${authURI}/?fromurl=${encodeURIComponent(url)}`);
}

/**
 * 发送空用户信息
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  响应对象
 * @param  {Function} next 下一步函数
 */
function postEmpty(req, res, next) {
    req.session.user = {};
    next();
}

/**
 * 权限检测
 * @param  {Object}   options 检测选项
 * @return {Function}         检测中间件
 */
exports.authCheck = function(options) {
    const opts = Object.assign({
        require: true // 是否强制验证
    }, options);
    /**
     * 检测用户
     * @param  {Object}   req  请求对象
     * @param  {Object}   res  响应对象
     * @param  {Function} next 下一步函数
    */
    return function(req, res, next) {
        // 检测是否有cookie
        if(!req.cookies.userkey) {
            log.debug('没有cookie信息');
            return opts.require ? postError(req, res, next) : postEmpty(req, res, next);
        }
        // 检测缓存数据与cookie是否相同.如果是,则直接使用缓存数据
        if(req.session.user && req.session.user.userkey === req.cookies.userkey) {
            log.debug('使用已有缓存数据');
            return next();
        }
        // 否则,查询cookie数据并写入缓存
        sessionApi.sessionService.getSessionId.get({
            sessionId: req.cookies.userkey,
            appid: projectName
        }).then(function(data) {
            log.debug('查询用户数据成功');
            log.debug(data);
            // 防止错误,多判断一次
            if(data.success && data.data) {
                // 设置用户登录信息
                req.session.user = {
                    userId: data.data.userId,
                    brandname: data.data.brandname,
                    nickname: data.data.nickname,
                    userkey: req.cookies.userkey
                };
                // 存储缓存
                sessionMid.save(req, res, next);
            }else {
                return opts.require ? postError(req, res, next) : postEmpty(req, res, next);
            }
        }).catch(function(err) {
            log.debug('查询用户数据失败');
            log.error(err);
            return opts.require ? postError(req, res, next) : postEmpty(req, res, next);
        });
    };
};