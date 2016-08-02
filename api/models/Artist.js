/**
 * Artist.js
 *
 * @description :: This class represents an artist invited to the festival.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
'use strict';

const path         = require('path');
const fse          = require('fs-extra');
const PICTURE_PATH = path.join(sails.config.appPath, 'media', 'artists');

// Create the artist's pictures and covers dir
if (!fse.existsSync(PICTURE_PATH)) { // eslint-disable-line no-sync
  fse.mkdirpSync(PICTURE_PATH); // eslint-disable-line no-sync
}


module.exports = {
  picturePath: PICTURE_PATH,
  autoPK:      false,
  attributes:  {
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
    photo:         { type: 'string' },
    banner:        { type: 'string' },
    bannerXOffset: { type: 'integer' },
    bannerYOffset: { type: 'integer' },
    facebook:      { type: 'string' },
    soundcloud:    { type: 'string' },
    mixcloud:      { type: 'string' },
    website:       {
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

