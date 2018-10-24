'use strict';
module.exports = {
    getCommonTopOrEndWebByPageId: [{
        packageName: 'java-djy-cmscommon-api',
        service: 'ICommonService',
        apiName: 'getCommonTopOrEndWebByPageId',
        method: 'get',
        dubboMethodName: 'getCommonTopOrEndWebByPageId',
        action: 'java-djy-cmscommon-api/ICommonService/getCommonTopOrEndWebByPageId',
        timeout: 10000,
        mock: function(data) {
            return '/java-djy-cmscommon-api/cms_' + data.data;
        }
    }],
    getUserMessageNum: [{
        packageName: 'java-djy-cmscommon-api',
        service: 'ICommonService',
        apiName: 'getUserMessageNum',
        method: 'get',
        dubboMethodName: 'getUserMessageNum',
        action: 'java-djy-cmscommon-api/ICommonService/getUserMessageNum',
        mock: 'rap',
        rapProjectId: '505'
    }]
};