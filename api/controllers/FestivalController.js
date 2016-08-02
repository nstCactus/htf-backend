/**
 * FestivalController
 *
 * @description :: Server-side logic for managing festivals
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';

/* global Artist */

const _      = require('lodash');
const path   = require('path');
const fs     = require('fs');

module.exports = {
  /**
   * Returns the full database content, as well as artist pictures & covers (base64 encoded) as a JSON string.
   * @param {Express.Request}   req The request
   * @param {Express.Response}  res The response
   * @return {void}
   */
  index: function(req, res){
    Set.find().populate([ 'artist', 'stage' ]).exec((err, sets) => {
      if (err) {
        sails.log.error('An error occurred while fetching sets.', err);

        res.serverError();
        return;
      } else {
        var tmpFileContent; // eslint-disable-line init-declarations
        for (var i in sets) { // eslint-disable-line guard-for-in
          // Replace the picture path with the actual picture (base64 encoded)
          if (!_.isNull(sets[i].artist.photo)) {
            // eslint-disable-next-line no-sync
            tmpFileContent = fs.readFileSync(path.join(Artist.picturePath, sets[i].artist.photo));
            sets[i].artist.photo = tmpFileContent.toString('base64');
          }

          // Replace the cover path with the actual picture (base64 encoded)
          if (!_.isNull(sets[i].artist.banner)) {
            // eslint-disable-next-line no-sync
            tmpFileContent = fs.readFileSync(path.join(Artist.picturePath, sets[i].artist.banner));
            sets[i].artist.banner = tmpFileContent.toString('base64');
          }
        }

        res.json(sets);
        return;
      }
    });
  },
};

