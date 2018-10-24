'use strict';
const server = require('@jlgl/orochi');
const log = server.logger;
const userAccountManagerApi = require('@dubbo/user-account-manager-north-api');

const sessionMid = require('../session');

const DEFAULT_AVATAR = 'https://t4.zbjimg.com/r/p/task/120.gif';

/**
 * 获取用户头像
 * @param  {Object}   options 获取选项
 * @return {Function}         获取中间件
 */
exports.getAvatar = function(options) {
    /**
    * 头像大小类型

    * 1对应small  https://avatar.zbjimg.com/011/65/62/200x200_avatar_26.jpg!small
    * 2对应middle https://avatar.zbjimg.com/011/65/62/200x200_avatar_26.jpg!middle
    * 3对应big https://avatar.zbjimg.com/011/65/62/200x200_avatar_26.jpg!big
    * 4对应large https://avatar.zbjimg.com/011/65/62/200x200_avatar_26.jpg!large
    */
    const opts = Object.assign({
        type: 1
    }, options);
    /**
     * 获取用户头像
     * @param  {Object}   req  请求对象
     * @param  {Object}   res  响应对象
     * @param  {Function} next 下一步函数
    */
    return function(req, res, next) {
        if(!req.session.user) {
            log.debug('没有用户信息,设置默认头像');
            req.session.user = {
                avatar: DEFAULT_AVATAR
            };
            return next();
        }
        if(!req.session.user.userId) {
            log.debug('没有登录用户信息,设置默认头像');
            req.session.user.avatar = DEFAULT_AVATAR;
            return next();
        }
        if(req.session.user.avatar) {
            log.debug('头像已存在');
            return next();
        }
        userAccountManagerApi.pictureService.getUserAvatarPath.get({
            data: Object.assign({
                user_id: req.session.user.userId
            }, opts)
        }).then(function(data) {
            log.debug('查询用户头像数据成功');
            log.debug(data);
            // 防止错误,多判断一次
            if(data.success && data.data) req.session.user.avatar = data.data;
            else req.session.user.avatar = DEFAULT_AVATAR;
            // 存储缓存
            sessionMid.save(req, res, next);
        }).catch(function(err) {
            log.debug('查询用户头像数据失败');
            log.error(err);
            req.session.user.avatar = DEFAULT_AVATAR;
            return next();
        });
    };
};

/**
 * 用户登出
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  响应对象
 * @param  {Function} next 下一步函数
 */
exports.logout = function(req, res, next) {
    // 检测是否有cookie
    if(!req.cookies.userkey) {
        log.debug('没有cookie信息');
        return next();
    }
    const curHostMatch = req.header('host').match(/([0-9a-z-]+).([0-9a-z-]+.[0-9a-z-]+)(:\d+){0,1}$/);
    res.clearCookie('userkey', {
        domain: curHostMatch ? curHostMatch[2] : ''
    });
    return sessionMid.clear(req, res, next);
};