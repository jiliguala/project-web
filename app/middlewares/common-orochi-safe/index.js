'use strict';
const xss = require('./xss');
const csrf = require('./csrf');

module.exports = {
    xss: xss,
    csrf: csrf
};