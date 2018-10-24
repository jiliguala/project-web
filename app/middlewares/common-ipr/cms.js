'use strict';
const server = require('@jlgl/orochi');
const app = server.app;

const cmsMod = require('../../modules/cms');

/**
 * [pcCommonCms 获取PC公共内容 新]
 *
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 *
 * @return {[type]}        [description]
 */
exports.pcCommonCmsNew = function(req, res, next) {
    cmsMod.getCmsByPageId(207, 10 * 60).then((data) => {
        let doamin = req.hostname.split('.')[0];
        let linkData = data[doamin + '-footer-links'] || '';
        res.locals.config = Object.assign(app.locals.config, {
            'commonCmsDataNew': data,
            'footerLink': linkData
        });
        next();
    }).catch(next);
};

/**
 * [pcCommonCmsBgl 八卦炉获取PC公共内容]
 *
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 *
 * @return {[type]}        [description]
 */
exports.pcCommonCmsBgl = function(req, res, next) {
    cmsMod.getCmsByPageId(233, 10 * 60).then((data) => {
        let doamin = req.hostname.split('.')[0];
        let linkData = data[doamin + '-footer-links'] || '';
        res.locals.config = Object.assign(app.locals.config, {
            'commonCmsDataBgl': data
        });
        next();
    }).catch(next);
};

/**
 * [pcCommonCms 获取PC公共内容]
 *
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 *
 * @return {[type]}        [description]
 */
exports.pcCommonCms = function(req, res, next) {
    cmsMod.getCmsByPageId(47, 10 * 60).then((data) => {
        res.locals.config = Object.assign(app.locals.config, {
            'commonCmsData': data
        });
        next();
    }).catch(next);
};

/**
 * [wapCommonCms 获取WAP公共内容]
 *
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 *
 * @return {[type]}        [description]
 */
exports.wapCommonCms = function(req, res, next) {
    cmsMod.getCmsByPageId(48, 10 * 60).then((data) => {
        res.locals.config = Object.assign(app.locals.config, {
            'commonCmsData': data
        });
        next();
    }).catch(next);
};