/**
 * Artist.js
 *
 * @description :: This class represents an artist invited to the festival.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
'use strict';

module.exports = {
  autoPK:     false,
  attributes: {
    id: {
      primaryKey: true,
      type:       'integer',
      required:   true,
    },
    name: {
      type:     'string',
      required: true,
    },
    label:  { type: 'string' },
    origin: {
      type: 'string',
      // required: true,
      // alpha:     true,
      // uppercase: true,
      // size:      2,
    },
    photo:      { type: 'string' },
    banner:     { type: 'string' },
    facebook:   { type: 'string' },
    soundcloud: { type: 'string' },
    mixcloud:   { type: 'string' },
    website:    {
      type: 'string',
      url:  true,
    },
    bioFr:      { type: 'text' },
    bioEn:      { type: 'text' },
    isFavorite: {
      type:       'boolean',
      defaultsTo: false,
    },

    // Associations
    sets: {
      collection: 'set',
      via:        'artist',
    },
  },
};

