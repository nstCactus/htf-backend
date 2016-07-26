/**
 * @author nstCactus
 * @date 19/07/16 19:59
 */
'use strict';

var path      = require('path');
const ONE_DAY = 60 * 60 * 24 * 1000;

module.exports.hadra = {
  dbUpdateInterval: ONE_DAY,
  picturePath:      path.join(process.cwd(), 'media', 'artists'),
  appId:            740634079373700,
  appSecret:        'overriden by local.js',
};
