'use strict';
module.exports = {
    getSessionId: [{
        packageName: 'session-manager-north-api',
        service: 'SessionService',
        apiName: 'getSessionId',
        method: 'get',
        dubboMethodName: 'getSessionId',
        action: 'session-manager-north-api/SessionService/getSessionId',
        mock: '/session-manager-north-api/get_session_id'
    }]
};