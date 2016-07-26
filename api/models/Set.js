/**
 * Set.js
 *
 * @description :: This class represents a music set during the festival.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
'use strict';

module.exports = {
  attributes: {
    style: {
      type: 'string',
    },
    type: {
      type: 'string',
      enum: [ 'dj', 'live', 'gig', 'vj', 'pause' ],
    },
    start: {
      type:     'string',
      datetime: true,
    },
    end: {
      type:     'string',
      datetime: true,
    },


    artists: {
      collection: 'artist',
    },
    scene: {
      model: 'scene',
    },
  },
};

