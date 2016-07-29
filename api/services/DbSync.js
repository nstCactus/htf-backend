/**
 * @author nstCactus
 * @date 27/07/16 20:28
 */
'use strict';

/* global Booking */
/* global Artist */
/* global Set */

const _         = require('lodash');
const request   = require('request');
const fse       = require('fs-extra');
const path      = require('path');
const url       = require('url');
var picturePath = path.join(sails.config.appPath, 'media', 'artists');


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
  if (booking.facebook.length > 0) {
    FacebookGraph.getPageInfo(booking.facebook, handleGraphApiPageInfoResponse);
  }

  Artist.create({
    id:         booking.id,
    name:       booking.name,
    label:      booking.label,
    origin:     booking.country,
    photo:      booking.photo,
    facebook:   booking.facebook,
    soundcloud: booking.soundcloud,
    mixcloud:   booking.mixcloud,
    website:    booking.website,
    bioFr:      booking.bio,
    bioEn:      booking.bio,
  }).exec(function(err, created){
    if (err) {
      sails.log.error(`An error occurred while creating artist #${booking.id}.`);
      sails.log.debug(err);
    } else {
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
        artist: created.id,
        stage:  booking.stage,
      }).exec(function(err, created){
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
 * @param {null|object} err     Not `null` if an error occurred.
 * @param {object}      data    Facebook Graph API response.
 * @param {string}      pageId  The page id used to make the request.
 * @return {void}
 */
function handleGraphApiPageInfoResponse(err, data, pageId){
  var fileExt = '';

  if (err) {
    sails.log.error(`An error occurred while getting artist info (method: "/${pageId}", message: "${err.message}".)`);
  } else {
    // Save info to database


    // Save picture
    if (
      data.picture
      && data.picture.data
      && _.isBoolean(data.picture.data.is_silhouette)
      && !data.picture.data.is_silhouette
    ) {
      FacebookGraph.getPagePicture(pageId, handleGraphApiPagePictResponse);
    } else {
      sails.log.warn(`Unexpected response from Facebook Graph API (page id: "${pageId}").`);
    }

    // Save cover
    if (data.cover && data.cover.source && _.isInteger(data.cover.offset_x) && _.isInteger(data.cover.offset_y)) {
      // Gets file extension by parsing the URL
      fileExt = path.extname(url.parse(data.cover.source).pathname);

      // Fetches the image and saves it locally
      request(data.cover.source)
        .pipe(fse.createWriteStream(path.join(picturePath, `${pageId}_cover${fileExt}`)))
        .on('response', function(response){
          console.log(response);
          // TODO: Update Db record
        })
        .on('error', function(err){
          sails.log.error(`An error occurred while saving cover picture for artist "${pageId}"`);
          console.error(err);
        });
    } else {
      sails.log.warn(`Unexpected response from Facebook Graph API (method: "${pageId}").`);
    }
  }
}

function handleGraphApiPagePictResponse(err, data, pageId){
  var fileExt = '';

  if (err) {
    sails.log.error(err);
  } else if (data.location) {
    // Get file extension by parsing the URL
    fileExt = path.extname(url.parse(data.location).pathname);

    // Get picture and save it locally.
    request(data.location)
      .pipe(fse.createWriteStream(path.join(picturePath, `${pageId}_picture${fileExt}`)))
      .on('response', function(response){
        console.log(response);
        // TODO: Update Db record
      })
      .on('error', function(err){
        sails.log.error(`An error occurred while saving picture for artist "${pageId}"`);
        console.error(err);
      });
  } else {
    sails.log.warn(`Unexpected response from Facebook Graph API (method: "${pageId}/picture").`);
    console.warn(data);
  }
}
