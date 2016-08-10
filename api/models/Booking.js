/**
 * This models represents the raw Hadra bookings, originating directly from Hadra's database.
 * @author nstCactus
 * @date 21/07/16 17:35
 */
'use strict';

module.exports = {
  tableName:     'htf2016_booking_table',
  connection:    'hadra',
  autoCreatedAt: false,
  autoUpdatedAt: false,
  migrate:       'safe',

  attributes: {
    id: {
      type:       'integer',
      primaryKey: true,
      required:   true,
    },
    name: {
      type:     'string',
      required: true,
    },
    label:       { type: 'string' },
    nationality: { type: 'string' },
    country:     { type: 'string' },
    bio:         { type: 'string' },
    photo:       { type: 'string' },

    // Social handles
    facebook:   { type: 'url' },
    soundcloud: { type: 'url' },
    mixcloud:   {
      type:       'url',
      columnName: 'myspace',
    },



    // Music set related information
    stage:     { type: 'integer' },
    timeStart: {
      type:       'datetime',
      columnName: 'time_start',
    },
    timeEnd: {
      type:       'datetime',
      columnName: 'time_end',
    },

    // Set type
    live: { type: 'boolean' },
    dj:   { type: 'boolean' },
    gig:  { type: 'boolean' },
  },
};

