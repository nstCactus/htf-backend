/**
 * @author nstCactus
 * @date 27/07/16 20:28
 */
'use strict';

/* global Booking */
/* global Artist */
/* global Set */
/* global FacebookGraph */

const _         = require('lodash');
const request   = require('request').defaults({ timeout: 60000 });
const fs        = require('fs');
const path      = require('path');
const url       = require('url');
var artistFixes = {};

const artistPicturesBaseUrl = 'http://www.hadra.net/HTF2016/ph_artists/';

initArtistFixes();

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
  // Try to fix the artist using the manually entered data saved in data/artists.js
  if (artistFixes[booking.id]) {
    var fix = artistFixes[booking.id];

    if (fix.hasOwnProperty('country') && fix.country !== null) {
      // Use the country from the fix file
      booking.country = fix.country;
    }

    if (fix.hasOwnProperty('facebook') && fix.facebook !== null && fix.facebook.startsWith('http')) {
      // Use the facebook URL from the fix file
      booking.facebook = fix.facebook;
    }

    if (fix.hasOwnProperty('bio') && typeof fix.bio === 'object') {
      // Use the english bio from the fix file
      if (fix.bio.hasOwnProperty('en') && booking.bio.en !== null) {
        booking.bioEn = fix.bio.en;
      }

      // Use the french bio from the fix file
      if (fix.bio.hasOwnProperty('fr') && booking.bio.fr !== null) {
        booking.bioFr = fix.bio.fr;
      }
    }
  }

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
  }).exec(function(err, createdArtist){ // eslint-disable-line complexity
    if (err) {
      sails.log.error(`An error occurred while creating artist #${booking.id}.`);
      sails.log.debug(err);
    } else {
      if (typeof booking.photo === 'string' && booking.photo.length > 0) {
        var extension = getFileExtensionFromUrl(booking.photo);
        var filename = sanitizeFilename(booking.name, extension);
        if (filename.indexOf('ph_') === 0) {
          filename = filename.substr(3);
        }

        sails.log.debug(`Fetching picture from Hadra for ${booking.name}.`);

        filename = 'photo_' + filename;
        savePicture(artistPicturesBaseUrl + booking.photo, filename, (err) => {
          var fetchFacebookPicture = typeof err !== 'undefined' && err !== null;
          if (!err) {
            Artist.update(createdArtist.id, { photo: filename }, (err) => {
              if (err) {
                sails.log.error(`An error occurred while update artist record (${createdArtist.id}) after fetching picture from Hadra.`, err);
              }
            });
          }

          if (booking.facebook.length > 0) {
            FacebookGraph.getPageInfo(booking.facebook, (err, data, pageId) => {
              handleGraphApiPageInfoResponse(err, data, pageId, createdArtist, fetchFacebookPicture);
            });
          } else {
            sails.log.warn(`No facebook URL for artist "${booking.name}". Won't fetch Facebook cover (got picture from Hadra).`);
          }
        });
      } else if (booking.facebook.length > 0) {
        FacebookGraph.getPageInfo(booking.facebook, (err, data, pageId) => {
          handleGraphApiPageInfoResponse(err, data, pageId, createdArtist);
        });
      } else {
        sails.log.warn(`No facebook URL for artist "${booking.name}". Won't fetch Facebook picture nor cover.`);
      }

      var setType = 'live';

      if (booking.dj == 1) { // eslint-disable-line eqeqeq
        setType = 'dj';
      }
      if (booking.gig == 1) { // eslint-disable-line eqeqeq
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
 * @param {null|object} err           Not `null` if an error occurred.
 * @param {object}      data          Facebook Graph API response.
 * @param {string}      pageId        The page id used to make the request.
 * @param {Artist}      artist        The artist to bind data with.
 * @param {boolean}     fetchPicture  [optional] Should the profile picture be fetched. Defaults to `true`.
 * @return {void}
 */
function handleGraphApiPageInfoResponse(err, data, pageId, artist, fetchPicture){
  fetchPicture = fetchPicture !== false; //eslint-disable-line no-param-reassign

  if (err) {
    sails.log.error(`An error occurred while getting artist info (method: "/${pageId}", message: "${err.message}".)`);
  } else {
    // Save picture
    if (fetchPicture) {
      if (data.picture
        && data.picture.data
        && _.isBoolean(data.picture.data.is_silhouette)
        && !data.picture.data.is_silhouette
      )
      {
        FacebookGraph.getPagePicture(pageId, (err, data, pageId) => {
          handleGraphApiPagePictResponse(err, data, pageId, artist);
        });
      } else {
        sails.log.warn(`Unexpected response from Facebook Graph API (page id: "${pageId}").`);
      }
    }

    // Save cover
    if (data.cover && data.cover.source) {
      var filename = 'cover_' + sanitizeFilename(artist.name, getFileExtensionFromUrl(data.cover.source));

      sails.log.debug(`Fetching cover for ${pageId}`);

      savePicture(data.cover.source, filename, (err) => {
        if (err) {
          sails.log.error(`An error occurred while downloading cover for ${pageId}.`, err);
        } else {
          Artist.update(artist.id, {
            banner:        filename,
            bannerXOffset: data.cover.offset_x || 0,
            bannerYOffset: data.cover.offset_y || 0,
          }).exec((err) => {
            if (err) {
              sails.log.error(`An error occurred while fetching cover for artist ${pageId}.`, err);
            }
          });
        }
      });
    } else {
      sails.log.warn(`Unexpected response from Facebook Graph API (method: "${pageId}").`, data);
    }
  }
}

function handleGraphApiPagePictResponse(err, data, pageId, artist){
  var filename = null;

  if (err) {
    sails.log.error(err);
  } else if (data.location) {
    sails.log.debug(`Fetching picture from Facebook for ${pageId}.`);

    filename = 'photo_' + sanitizeFilename(artist.name, getFileExtensionFromUrl(data.location));

    savePicture(data.location, filename, handlePictureSaved);
  } else {
    sails.log.warn(`Unexpected response from Facebook Graph API (method: "${pageId}/picture").`);
    console.warn(data);
  }

  function handlePictureSaved(err){
    if (err) {
      sails.log.error(`An error occurred while downloading picture for ${pageId}.`, err);
    } else {
      Artist.update(artist.id, { photo: filename }).exec((err) => {
        if (err) {
          sails.log.error(`An error occurred while updating artist record after fetching picture from Facebook (${pageId}).`, err);
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

  function handleResponse(response){
    // Start piping to a file, if the request was a success (2xx) or a redirection (3xx)
    if (response.statusCode >= 200 && response.statusCode < 400) {
      currentRequest.pipe(fs.createWriteStream(fullPath));
    }

    // Wait for request completion to announce success
    response.on('end', function(){
      sails.log.debug(`Finished downloading ${filename}`);
      callback(null, fullPath);
    });
  }
}

function getFileExtensionFromUrl(fileUrl){
  // Gets file extension by parsing the URL
  return path.extname(url.parse(fileUrl).pathname);
}

function initArtistFixes(){
  const artists   = require('../../data/artists.js');

  // eslint-disable-next-line guard-for-in
  for (var i in artists) {
    var artist = artists[i];
    var id = artist.id;
    delete artist.id;
    artistFixes[id] = artist;
  }
}

function sanitizeFilename(filename, extension){
  if(extension.substr(0, 1) !== '.') {
    extension = '.' + extension;
  }

  filename = filename.toString().toLowerCase();
  filename = filename.replace(/[.–+=/|* ]/g, '-');
  filename = filename.replace(/[^a-z0-9_-]/gi, '');

  return filename + extension;
}
