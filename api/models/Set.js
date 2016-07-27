/**
 * Set.js
 *
 * @description :: This class represents a music set during the festival.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
'use strict';

module.exports = {
  attributes: {
    style: { type: 'string' },
    type:  {
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

    // Associations
    artist: {
      required:   true,
      model:      'artist',
      columnName: 'artist_id',
    },
    stage: {
      required:   true,
      model:      'stage',
      columnName: 'stage_id',
    },
  },
};

