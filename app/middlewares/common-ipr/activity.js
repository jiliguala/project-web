'use strict';
/**
 * 获取活动数据
 * @author zhangjingj
 */
const server = require('@jlgl/orochi');
const config = server.config;
const log = server.logger;
const cacheClient = server.cacheClient;
const actApi = require('@dubbo/java-djy-act-api');
// 使用mock模式或正常模式
const apiClient = config.mock ? require('@jlgl/api-gateway-mock') : require('@jlgl/orochi-gateway');
// 注册活动接口
apiClient.registerApi([{
    packageName: 'java-djy-act-api',
    service: 'IActivityTimeService',
    apiName: 'getNowActivityTime',
    method: 'get',
    dubboMethodName: 'getNowActivityTime',
    action: 'java-djy-act-api/IActivityTimeService/getNowActivityTime',
    mock: 'rap',
    rapProjectId: '515'
}]);

const ACTIVITY_CACHE_KEY = 'activity-info';

/**
 * 获取活动状态信息
 * @return {Function} Promise函数
 */
function getActivityStatus(opt) {
    let activityInfo = {};
    const curTime = opt.customTime || new Date(); // 查询当前时间
    log.debug('======== 开始请求活动数据 ========');
    return actApi.iActivityTimeService.getNowActivityTime.get({
        data: curTime
    })
        .then(function(data) { // 查询并处理数据,并到缓存中
            log.debug(data);
            let expireTime = 0;
            let curTimestamp = curTime.getTime();
            if(!data.success || !data.data) {
                throw new Error(data.description || '没有活动信息');
            }
            data.data.forEach(function(item) {
                // 注意这里返回的是10位时转换为毫秒数
                const curExpireTime = (item.endTime.toString().length === 10 ? item.endTime * 1000 : item.endTime) - curTimestamp;
                activityInfo[item.activityId] = Object.assign({}, item);
                // 如果expireTime === 0 或者当前过期时间小于expireTime时,重置过期时间
                if(!expireTime || curExpireTime < expireTime) {
                    expireTime = curExpireTime;
                }
            });
            if(expireTime <= 0) { // 如果过期时间不正常,直接抛弃
                throw new Error('活动数据不正常,已被抛弃');
            }
            log.debug('======== 查询到活动数据,设置缓存: 缓存时间 ' + expireTime + ' ms========');
            // 这里设置为秒数
            return cacheClient.set(ACTIVITY_CACHE_KEY, JSON.stringify(activityInfo), 'EX', Math.floor(expireTime / 1000))
                .then(function() { // 设置成功后返回活动信息
                    return activityInfo;
                });
        });
}

/**
 * 错误返回处理
 * @param  {Object}   req  请求对象
 * @param  {Object}   res  响应对象
 * @param  {Function} next 下一步函数
 */
function returnError(req, res, next) {
    res.locals.activityInfo = {};
    next();
}

/**
 * 获取活动状态
 * @param  {Object}   options 自定义配置
 * @return {Function}         中间件函数
 */
exports.getActivities = function(options) {
    const opt = Object.assign({
        customTime: null // 自定义查询时间,请使用一个Date对象
    }, options);
    /**
     * 获取正在进行的活动列表
     * @param  {Object}   req  请求对象
     * @param  {Object}   res  响应对象
     * @param  {Function} next 下一步函数
    */
    return function(req, res, next) {
        if(!config.activityCheck) {
            log.debug('======== 没有开启活动检测,已略过 ========');
            return returnError(req, res, next);
        }
        // 首先查询是否有key
        cacheClient.get(ACTIVITY_CACHE_KEY)
            .then(function(data) { // 解析数据
                if(data) {
                    log.debug('======== 读取活动缓存数据成功 ========');
                    return Promise.resolve(JSON.parse(data));
                }
                return getActivityStatus(opt);
            })
            .then(function(activityInfo) { // 设置数据
                res.locals.activityInfo = activityInfo;
                next();
            })
            .catch(function(err) {
                log.warning(err);
                returnError(req, res, next);
            });
    };
};