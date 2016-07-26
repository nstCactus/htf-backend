/**
 * Scene.js
 *
 * @description :: This class represents scene of the festival.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
'use strict';

module.exports = {
  attributes: {
    name: {
      type:     'string',
      required: true,
    },


    sets: {
      collection: 'set',
    },
  },
};

