'use strict';
const server = require('@jlgl/orochi');
const log = server.logger;
const app = server.app;

const toolMod = require('../../modules/tool');

const cmsApi = require('@dubbo/java-djy-cmscommon-api');
const declareApi = require('@dubbo/java-djy-customdeclare-api');

/**
 * [pcSystemMessage 获取PC公共系统消息]
 *
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 *
 * @return {[type]}        [description]
 */
exports.pcSystemMessage = function(req, res, next) {
    const userId = req.session.user ? req.session.user.userId : '';
    if(!req.session.user.userId) {
        log.debug('用户未登录,没有系统消息');
        return next();
    }
    cmsApi.iCommonService.getUserMessageNum.get(toolMod.rebuildDubboData(userId, req))
        .then((data) => {
            res.locals.config = Object.assign(app.locals.config, {
                'commonSystemMessageData': data.data,
            });
            next();
        }).catch(next);
};

/**
 * [pcIsShowZzsb 获取用户是否有查看我的申报信息]
 *
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 *
 * @return {[type]}        [description]
 */
exports.pcIsShowZzsb = function(req, res, next) {
    const userId = req.session.user ? req.session.user.userId : '';
    if(!req.session.user.userId) {
        log.debug('用户未登录,没有申报信息');
        return next();
    }
    declareApi.iTrademarkService.hasCreatedTrademarkView.get(toolMod.rebuildDubboData(userId, req))
        .then((data) => {
            res.locals.config = Object.assign(app.locals.config, {
                'isShowZzsb': data.data,
            });
            next();
        }).catch(next);
};