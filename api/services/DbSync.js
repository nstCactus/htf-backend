/**
 * @author nstCactus
 * @date 27/07/16 20:28
 */
'use strict';

/* global Booking */
/* global Artist */
/* global Set */
/* global FacebookGraph */

const _       = require('lodash');
const request = require('request');
const fs      = require('fs');
const path    = require('path');
const url     = require('url');

module.exports = {
  sync: function(){
    Booking.find(handleFetchedBookings);
  },
};

function handleFetchedBookings(err, bookings){
  if (err) {
    sails.log.error('An error occurred while syncing with Hadra\'s database: ');
    sails.log.debug(err);

    return;
  }

  _.each(bookings, handleSingleBooking);
}

function handleSingleBooking(booking){
  Artist.create({
    id:         booking.id,
    name:       booking.name,
    label:      booking.label,
    origin:     booking.country,
    // photo:      booking.photo,
    facebook:   booking.facebook,
    soundcloud: booking.soundcloud,
    mixcloud:   booking.mixcloud,
    website:    booking.website,
    bioFr:      booking.bio,
    bioEn:      booking.bio,
  }).exec(function(err, createdArtist){
    if (err) {
      sails.log.error(`An error occurred while creating artist #${booking.id}.`);
      sails.log.debug(err);
    } else {
      if (booking.facebook.length > 0) {
        FacebookGraph.getPageInfo(booking.facebook, (err, data, pageId) => {
          handleGraphApiPageInfoResponse(err, data, pageId, createdArtist.id);
        });
      }

      var setType = 'live';

      if (booking.dj === 1 || booking.dj === '1') {
        setType = 'dj';
      }
      if (booking.gig === 1 || booking.gig === '1') {
        setType = 'gig';
      }


      Set.create({
        start:  booking.timeStart == 0 ? null : new Date(booking.timeStart * 1000), // eslint-disable-line eqeqeq
        end:    booking.timeEnd == 0 ? null : new Date(booking.timeEnd * 1000), // eslint-disable-line eqeqeq
        type:   setType,
        artist: createdArtist.id,
        stage:  booking.stage,
      }).exec(function(err){
        if (err) {
          sails.log.error(`An error occurred while creating set for artist #${booking.id}.`);
          sails.log.debug(err);
        }
      });
    }
  });
}

/**
 * Handle Facebook Graph API response to page information requests.
 * @param {null|object} err       Not `null` if an error occurred.
 * @param {object}      data      Facebook Graph API response.
 * @param {string}      pageId    The page id used to make the request.
 * @param {int}         artistId  The database id of the artist to bind data with
 * @return {void}
 */
function handleGraphApiPageInfoResponse(err, data, pageId, artistId){
  var fileExt = '';

  if (err) {
    sails.log.error(`An error occurred while getting artist info (method: "/${pageId}", message: "${err.message}".)`);
  } else {
    // Save picture
    if (
      data.picture
      && data.picture.data
      && _.isBoolean(data.picture.data.is_silhouette)
      && !data.picture.data.is_silhouette
    ) {
      FacebookGraph.getPagePicture(pageId, (err, data, pageId) => {
        handleGraphApiPagePictResponse(err, data, pageId, artistId);
      });
    } else {
      sails.log.warn(`Unexpected response from Facebook Graph API (page id: "${pageId}").`);
    }

    // Save cover
    if (data.cover && data.cover.source && _.isInteger(data.cover.offset_x) && _.isInteger(data.cover.offset_y)) {
      var filename = `${pageId}_cover${fileExt}` + getFileExtensionFromUrl(data.cover.source);

      sails.log.debug(`Fetching cover for ${pageId}`);

      savePicture(data.cover.source, filename, (err) => {
        if (err) {
          sails.log.error(`An error occurred while downloading cover for ${pageId}.`, err);
        } else {
          Artist.update(artistId, {
            banner:        filename,
            bannerXOffset: data.cover.offset_x,
            bannerYOffset: data.cover.offset_y,
          }).exec((err) => {
            if (err) {
              sails.log.error(`An error occurred while fetching cover for artist ${pageId}.`, err);
            }
          });
        }
      });
    } else {
      sails.log.warn(`Unexpected response from Facebook Graph API (method: "${pageId}").`);
    }
  }
}

function handleGraphApiPagePictResponse(err, data, pageId, artistId){
  var filename = null;

  if (err) {
    sails.log.error(err);
  } else if (data.location) {
    filename = `${pageId}_picture` + getFileExtensionFromUrl(data.location);

    savePicture(data.location, filename, handlePictureSaved);
  } else {
    sails.log.warn(`Unexpected response from Facebook Graph API (method: "${pageId}/picture").`);
    console.warn(data);
  }

  function handlePictureSaved(err){
    if (err) {
      sails.log.error(`An error occurred while downloading picture for ${pageId}.`, err);
    } else {
      Artist.update(artistId, { photo: filename }).exec((err) => {
        if (err) {
          sails.log.error(`An error occurred while fetching picture for artist ${pageId}.`, err);
        }
      });
    }
  }
}

/**
 * Fetches the file at `fileUrl` and saves it to `filename`.
 * @param {string}    fileUrl   The `url` of the file to download.
 * @param {string}    filename  The name of the file to save to.
 * @param {function}  callback  A callback invoked when the file has been downloaded or if an error occurs.
 *                              It must accept two parameters:
 *                                * {Error|null}  err
 *                                * {object}      data
 * @return {void}
 */
function savePicture(fileUrl, filename, callback){
  var fullPath = path.join(Artist.picturePath, filename);

  var currentRequest = request(fileUrl)
    .on('response', handleResponse)
    .on('error', callback);

  // TODO: Gérer les timeout
  function handleResponse(response){
    // Start piping to a file, if the request was a success (2xx) or a redirection (3xx)
    if (response.statusCode >= 200 && response.statusCode < 400) {
      currentRequest.pipe(fs.createWriteStream(fullPath));
    }

    // Wait for request completion to announce success
    response.on('end', function(){
      callback(null, fullPath);
    });
  }
}

function getFileExtensionFromUrl(fileUrl){
  // Gets file extension by parsing the URL
  return path.extname(url.parse(fileUrl).pathname);
}
