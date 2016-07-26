/**
 * Global Variable Configuration
 * (sails.config.globals)
 *
 * Configure which global variables which will be exposed
 * automatically by Sails.
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.globals.html
 */
'use strict';

module.exports.globals = {
  sails:    true,
  models:   true,
  services: true,
  // _:        true,
  async:    true,
};
