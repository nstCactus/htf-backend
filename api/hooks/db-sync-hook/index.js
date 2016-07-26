/**
 * @author nstCactus
 * @date 19/07/16 19:50
 *
 * This hook is responsible for sync the local database with Hadra's.
 * It hooks on application initialization a is called regularly.
 * Its configuration is stored in _config/hadra.js_.
 */
'use strict';
/* global Booking */
/* global Artist */
/* global Set */

const _       = require('lodash');
const request = require('request');
const fse     = require('fs-extra');
const path    = require('path');
const url     = require('url');

module.exports = function dbSyncHook(sails){
  var failCount         = 0;
  var dbUpdateInterval  = 86400000;
  var picturePath       = path.join(sails.config.appPath, 'media', 'artists');
  var tmp               = null;
  const MAX_ERROR_COUNT = 5;

  // Get dbUpdateInterval from config, if it is set
  try {
    tmp = sails.config.hadra.dbUpdateInterval;
    dbUpdateInterval = tmp;
  } catch (err) {
    console.warn('Missing configuration directive "sails.config.hadra.dbUpdateInterval".');
  }

  // Get picturePath from config, if it is set
  try {
    tmp = sails.config.hadra.picturePath;
    picturePath = tmp;
  } catch (err) {
    console.warn('Missing configuration directive "sails.config.hadra.picturePath".');
  }

  //   Create picturePath if it doesn't exists. It's safe to do it synchronously as it's a one time thing.
  // eslint-disable-next-line no-sync
  if (!fse.existsSync(picturePath)) {
    // eslint-disable-next-line no-sync
    fse.mkdirsSync(picturePath);
  }

  return {
    defaults:   { maxErrorCount: 5 },
    initialize: function(cb){
      sails.on('lifted', function(){
        syncDatabase();
      });

      return cb();
    },
  };

  function syncDatabase(){
    sails.log.debug('Time for a database update!');

    Booking.find(handleFetchedBookings);

    setTimeout(syncDatabase, dbUpdateInterval);
  }

  function handleFetchedBookings(err, bookings){
    if (err) {
      sails.log.error('An error occurred while syncing with Hadra\'s database: ');
      sails.log.debug(err);
      failCount++;

      if (failCount <= MAX_ERROR_COUNT) {
        sails.log.error(`Will retry (${failCount}/${MAX_ERROR_COUNT}): `);
        setTimeout(syncDatabase, dbUpdateInterval);
      } else {
        sails.log.error('Max consecutive error count reached. Won\'t retry anymore.');
      }

      return;
    }

    failCount = 0;

    // TODO: Connect to Hadra db, fetch htf2016_booking_table, clean it,
    // augment it from Facebook and save it locally.
    _.each(bookings, handleSingleBooking);
  }

  function handleSingleBooking(booking){
    if (booking.facebook.length > 0) {
      FacebookGraph.getPageInfo(booking.facebook, handleGraphApiPageInfoResponse);
    }
    /*
     * Check s'il existe dans la table d'historique
     * S'il existe pas, on est bons ! On l'ajoute, à la table d'historique et on créé les modèles qui vont bien.
     * Sinon, on vérifie si l'enregistrement a été modifié
       * Si non, c'est bon, on arrête tout
       * Si oui, on log tous les champs modifiés
     */

    /*
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
     }
     });

     Set.create({

     });
     */
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
};
