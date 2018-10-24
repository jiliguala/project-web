'use strict';
const crypto = require('crypto');

/**
 * 加密方法
 * @param  {String} algorithm 加密算法,['blowfish','aes-256-cbc','cast','des','des3','idea','rc2','rc4','seed'],推荐aes-256-cbc
 * @param  {String} key       密钥,请统一
 * @param  {Array}  buf       加密内容
 * @return {String}           加密后的串
 */
function cipher(algorithm, key, buf) {
    let encrypted = '';
    const cip = crypto.createCipher(algorithm, key);
    encrypted += cip.update(buf, 'binary', 'hex');
    encrypted += cip.final('hex');
    return encrypted;
}

/**
 * 解密方法
 * @param  {String} algorithm 加密算法,['blowfish','aes-256-cbc','cast','des','des3','idea','rc2','rc4','seed'],推荐aes-256-cbc
 * @param  {String} key       密钥,请统一
 * @param  {String} encrypted 加密串
 * @return {String}           解密后的串
 */
function decipher(algorithm, key, encrypted) {
    let decrypted = '';
    const decipher = crypto.createDecipher(algorithm, key);
    decrypted += decipher.update(encrypted, 'hex', 'binary');
    decrypted += decipher.final('binary');
    return decrypted;
}

exports.cipher = cipher;
exports.decipher = decipher;