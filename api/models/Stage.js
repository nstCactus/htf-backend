/**
 * Stage.js
 *
 * @description :: This class represents a stage of the festival.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
'use strict';

module.exports = {
  attributes: {
    name: {
      type:     'string',
      required: true,
    },

    // Associations
    sets: {
      collection: 'set',
      via:        'stage',
    },
  },
};

