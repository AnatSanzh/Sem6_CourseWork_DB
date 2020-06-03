const _ = require('lodash');

module.exports = (keys, value) => keys.reduce((obj, key) => ({...obj, [key]: JSON.parse(JSON.stringify(value)) /*_.cloneDeep(value)*/}),{});