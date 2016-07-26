/**
 * Scene.js
 *
 * @description :: This class represents scene of the festival.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
'use strict';

module.exports = {
  attributes: {
    style: {
      type:     'name',
      required: true,
    },


    sets: {
      collection: 'set',
    },
    scene: {
      model: 'scene',
    },
  },
};

