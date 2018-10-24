'use strict';
const server = require('@jlgl/orochi');
const config = server.config;
const log = server.logger;

const STATUS_CODE = require('../enums/status_code');

const cms = require('@dubbo/java-djy-cmscommon-api');

/**
 * [getCMSData 获取CMS数据]
 *
 * @param  {Number} pageId [页面ID]
 * @return {Promise}       [Promise]
 */
function getCmsData(pageId) {
    log.debug('======== 获取CMS配置数据，传入页面ID：' + pageId + ' ========');
    return cms.iCommonService.getCommonTopOrEndWebByPageId.get({
        data: pageId
    }).then((data) => {
        if (!data.success) {
            let err = new Error('======== 获取公共CMS数据失败:' + data.description + ' ========');
            err.status = STATUS_CODE.API_ERROR;
            return Promise.reject(err);
        }
        let cmsData = {};
        let areaData = data.data.pageData || [];
        // 数据处理
        areaData.forEach(function(val) {
            if (val.baseInfo) {
                // 区块基础信息
                cmsData[val.ukey] = Object.assign(val.baseInfo);

                // 区块组件列表信息
                cmsData[val.ukey]['list'] = val.list || [];
            }
        });
        /***去掉数据处理****/
        log.debug('======== 获取CMS配置数据成功' + pageId + ' ========');
        return Promise.resolve(JSON.stringify(cmsData));
    });
}

/**
 * [getCmsByPageId 根据页面pageid获取cms配置数据]
 *
 * @param  {Number} pageId [页面ID]
 * @param  {Number} expire [过期时间]
 * @return {Promise}       [Promise]
 */
exports.getCmsByPageId = function(pageId, expire) {
    const key = 'djy-cms-' + pageId;
    const expireTime = expire || config.cmsExpire || 10 * 60;
    let promiseFunc = Promise.resolve();
    // 有设置缓存时间，1、有查询到缓存数据并返回；2、未查询到缓存数据，通过接口获取然后缓存对应数据
    if(expire > 0) {
        promiseFunc = promiseFunc.then(function() {
            return server.getCacheClient().get(key);
        })
            .then(function(data) {
                if(data) {
                    log.debug('======== 读取CMS缓存数据成功！' + pageId + ' ========');
                    return Promise.resolve(data);
                }
                return getCmsData(pageId)
                    .then(function(cmsData) {
                        log.debug('======== 缓存CMS数据成功！' + pageId + ' ========');
                        return server.getCacheClient().set(key, cmsData, 'EX', expireTime)
                            .then(function() {
                                return Promise.resolve(cmsData);
                            });
                    });
            });
    // 没有设置缓存时间则直接通过接口读取数据，且不做缓存处理
    }else {
        promiseFunc = promiseFunc.then(function() {
            return getCmsData(pageId);
        });
    }
    return promiseFunc.then(function(data) {
        return JSON.parse(data);
    });
};