'use strict';
const auth = require('./auth');
const account = require('./account');
const activity = require('./activity');
const cms = require('./cms');
const user = require('./user');

module.exports = {
    auth: auth,
    activity: activity,
    account: account,
    cms: cms,
    user: user
};