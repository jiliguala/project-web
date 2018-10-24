'use strict';
const server = require('@jlgl/orochi');
const router = server.getRouter();
const mapMod = require('../../modules/map');

exports.rootPath = '/static/map';

router.get('/config/', function(req, res) {
    const mapInfo = mapMod.getInfo();
    res.set({
        'Content-Type': 'application/javascript; charset=utf-8'
    });
    res.end(`(function() {
    seajs.on('resolve', function () {
        seajs.data.base = '';
    });
    seajs.config({
        map: ${mapInfo.list}
    });
})();`);
});

exports.router = router;