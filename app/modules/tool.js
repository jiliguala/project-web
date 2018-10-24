'use strict';
const crypto = require('crypto');
const xss = require('xss');
const server = require('@jlgl/orochi');
const UAParser = require('ua-parser-js');

const config = server.config;
const projectName = server.projectName;
const log = server.logger;

const STATUS_CODE = require('../enums/status_code');

/**
 * 创建签名
 * @param  {String} val    源值
 * @param  {String} secret 密钥
 * @return {String}        签名
 */
function sign(val, secret) {
    return crypto
        .createHmac('md5', secret)
        .update(val)
        .digest('hex');
}

/**
 * 判断当前是否为ajax请求
 * @param req
 * @returns {boolean}
 */
function isAjaxRequest(req) {
    let requestType = req.headers['X-Requested-With'] || req.headers['x-requested-with'];
    let acceptType = req.headers['Accept'] || req.headers['accept'];
    return {
        result: requestType === 'XMLHttpRequest',
        needJson: requestType === 'XMLHttpRequest' && /application\/json/.test(acceptType)
    };
}
exports.isAjaxRequest = isAjaxRequest;

/**
 * 根据request对象设置分页数量
 * @param  {object} req request对象
 */
exports.buildPageInfo = function(req) {
    req.query.page = parseInt(req.query.page);
    req.query.pageSize = parseInt(req.query.pageSize);
    if(!req.query.page || req.query.page < 0) req.query.page = 1;
    if(!req.query.pageSize || req.query.pageSize > config.maxPageSize) req.query.pageSize = config.pageSize;
};

/**
 * 过滤限制数据
 * @param  {Object} data 过滤前数据
 * @return {String}
 */
function filterLimitData(data) {
    let result = JSON.stringify(data);
    // 替换敏感字符串
    return result.replace(/"(mobile|phone|telphone|telephone|email)":"([^"]{2})[^"]+([^"]{2})"/ig, '"$1":"$2****$3"');
}

exports.filterLimitData = filterLimitData;

/**
 * 构建成功JSON
 * @param  {String} msg  返回信息
 * @param  {Object} data 返回数据
 * @return {Object}
 */
exports.buildResJson = function(msg, data) {
    const args = Array.prototype.slice.call(arguments, 2);
    let result = Object.create(null);
    result.msg = msg;
    result.status = STATUS_CODE.SUCCESS;
    //计算分页
    if(args.length > 0) {
        result.data = {
            content: data,
            page: args[0],
            pageSize: args[1],
            total: args[2]
        };
    }else {
        result.data = data;
    }
    //打印成功返回数据
    log.info('请求返回数据:');
    log.info(filterLimitData(result));
    return result;
};

/**
 * 构建成功数据
 * @param  {Object} data 返回数据
 * @return {Object}
 */
exports.buildRes = function(data) {
    //打印成功返回数据
    log.info('模板返回数据:');
    log.info(filterLimitData(data));
    return data;
};

/**
 * 查询是否为空对象
 * @param  {Object}  obj 查询对象
 * @return {Boolean}     查询结果
 */
function isObjEmpty(obj) {
    // Speed up calls to hasOwnProperty
    let hasOwnProperty = Object.prototype.hasOwnProperty;

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== 'object') return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (let key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}
exports.isObjEmpty = isObjEmpty;

/**
 * 获取错误信息
 * @param  {Object} err 错误堆栈信息
 * @param  {Object} req 请求对象
 * @return {Object}     错误对象
 */
exports.getErrorMsg = function(err, req) {
    let code = err.code || err.status || STATUS_CODE.UNKNOWN_ERROR;
    // 插入dubbo错误
    if(/dubbo/.test(err.message)) {
        code = STATUS_CODE.API_DUBBO_ERROR;
    }
    if(req && req.sidInfos) {
        req.sidInfos.forEach(logError);
    }else logError();
    // 生成返回数据
    let message = err.message || err.stack;
    if(/^\d+$/.test(code)) {
        switch(code) {
        case STATUS_CODE.NOT_FOUND:
            message = '找不到当前页面';
            break;
        case STATUS_CODE.UNKNOWN_ERROR:
            message = '系统错误';
            break;
        case STATUS_CODE.GETWAY_ERROR:
            message = '数据访问异常，请稍后重试';
            break;
        case STATUS_CODE.API_DUBBO_ERROR:
            message = '查询数据错误';
            break;
        }
    }else{
        code = STATUS_CODE.UNKNOWN_ERROR;
        message = '未知异常，请记录相关地址/操作并联系管理员处理';
    }
    function logError(sidInfo) {
        switch(code) {
        case STATUS_CODE.UNKNOWN_ERROR:
            // 记录错误日志
            if(sidInfo) {
                log.error(sidInfo + '**' + err);
                log.error(err);
            }
            else log.error(err);
            break;
        default:
            // 记录警告日志
            if(sidInfo) {
                log.info(sidInfo + '**' + err);
                log.info(err);
            }
            else log.info(err);
        }
    }
    return {
        status: code,
        msg: message
    };
};

/**
 * 过滤字符串中的特殊数据
 * @param  {String} str 源字符串
 * @return {String}     过滤后字符串
 */
exports.filterString = function(str) {
    return xss(str);
};

/**
 * 获取操作数据
 * @param  {Object} req 请求对象
 * @return {Object}     action对象
 */
function getActionData(req) {
    const uaInfo = new UAParser(req.header('User-Agent'));
    let phoneType = 3;
    switch(uaInfo.getOS().name) {
    case 'Android':
        phoneType = 1;
        break;
    case 'iOS':
        phoneType = 2;
        break;
    }
    return {
        userId: req.session.user ? req.session.user.userId : '',
        nickname: req.session.user ? req.session.user.nickname : '',
        sourceIp: getIp(req),
        phoneType: phoneType
    };
}

exports.getActionData = getActionData;

/**
 * 重建dubbo数据
 * @param  {Any}    data 请求数据
 * @param  {Object} req  请求对象
 * @return {Object}      请求数据
 */
exports.rebuildDubboData = function (data, req) {
    const sid = sign(projectName + '-' + (req.session && req.session.user ? req.session.user.userId : 'guest') + '-' + new Date().getTime(), 'sid'); //创建sid
    const sidArray = [];
    // 加入sid标识
    sidArray.push('sid:' + sid);
    sidArray.push('hostname:' + (process.env.HOSTNAME || ''));
    sidArray.push('clientIp:' + getIp(req));
    const sidInfo = sidArray.join('#');
    // 插入sid标识
    if(req.sids) {
        req.sidInfos.push(sidInfo);
        req.sids.push(sid);
    }
    else {
        req.sidInfos = [sidInfo];
        req.sids = [sid];
    }
    let sendData;
    if((typeof data) === 'object' && !Array.isArray(data)) {
        sendData = Object.assign({}, data);
        if(req.query.pageSize) sendData.pageSize = req.query.pageSize;
        if(req.query.page) sendData.pageNum = req.query.page;
    }else {
        sendData = data;
    }
    const returnData = {
        sid: sid,
        data: sendData,
        actionInfo: getActionData(req)
    };
    // 插入请求数据并打印sid信息
    log.info(sidInfo, '**' + filterLimitData(returnData));
    return returnData;
};

/**
 * 获取客户端IP
 * @author zhangjingj
 * @create-time 2018-03-23
 * @param  {Object}   req  请求对象
 * @return {String}        结果IP
 */
function getIp(req) {
    const ipStr = req.headers['http_x_real_ip'] // 判断ng反向代理特殊头
                    || req.headers['http_client_ip']
                    || req.headers['http_x_forwarded_for']
                    || req.headers['remote_addr']
                    || req.headers['x-forwarded-for']
                    || req.connection.remoteAddress // 判断 connection 的远程 IP
                    || req.socket.remoteAddress // 判断后端的 socket 的 IP
                    || req.connection.socket.remoteAddress
                    || '';
    const ipArr = ipStr.match(/[\d.]{7,15}/);
    const ip = ipArr ? ipArr[0] : 'unknown';
    return ip;
}

exports.getIp = getIp;


/**
 * 调用接口返回值如果错误，直接用defaultValue来替换error,优化错误处理
 * @author yanle
 * @param promiseFunc           promise函数，
 * @param defaultValue          如果出现接口错误直接用defaultValue替换error
 * @returns {Promise<any>}      返回错误的
 */
exports.rebuildResError = function (promiseFunc, defaultValue) {
    return new Promise(function (resolve) {
        promiseFunc.then(function(data) {
            if(!data.success) {
                throw new Error(data.description);
            }
            if(!data.data) {
                throw new Error('返回数据异常');
            }
            resolve(data);
        }).catch(function (err) {
            log.warning(err);
            resolve({
                success: true,
                data: defaultValue,
                description: '获取数据错误，已重置',
                currentPage: 0,
                totalNum: 0,
                totalPage: 0
            });
        });
    });
};