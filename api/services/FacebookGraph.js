/**
 * @author nstCactus
 * @date 23/07/16 13:25
 */
'use strict';

var graph = require('fbgraph');

graph.setAccessToken(sails.config.hadra.appId + '|' + sails.config.hadra.facebookAppSecret);
graph.setVersion('2.7');

module.exports = {

  /**
   * Query Facebook Graph API to retrieve page info.
   * @param {string}    pageHandle  May be either the identifier of a user (page slug or numeric id) or the full URL.
   *                                The following example are accepted:
   *                                  * http://facebook.com/shotumusic
   *                                  * facebook.com/pages/shotumusic
   *                                  * https://www.facebook.com/1982545983420
   * @param {function}  callback  A callback to be invoked when graph API returns a result.
   *                              The callback takes must accept three parameters:
   *                                * err:    not null if an error occurred during the request.
   *                                * data:   the data retrieved from the Facebook Graph API.
   *                                * pageId: the page id used to make the request (pageHandle sanitized).
   * @return {boolean}  `false` if the `pageHandle` is not a valid facebook page URL or id, `true` otherwise.
     */
  getPageInfo: function(pageHandle, callback){
    var pageId = sanitizePageHandle(pageHandle);

    if (!pageId) {
      sails.log.error(`idOrUrl parameter must be either a Facebook page URL or a Facebook username. "${pageHandle}" given.`);

      return false;
    }

    graph.get(pageId, { fields: [ 'id', 'name', 'cover', 'picture' ].join() }, function(err, data){
      callback(err, data, pageId);
    });

    return true;
  },

  /**
   * Query Facebook Graph API to retrieve a page picture.
   * @param {string}    pageHandle  May be either the identifier of a user (page slug or numeric id) or the full URL.
   * @param {function}  callback    A callback to be invoked when graph API returns a result.
   *                                The callback takes must accept three parameters:
   *                                  * err:    not null if an error occurred during the request.
   *                                  * data:   the data retrieved from the Facebook Graph API.
   *                                  * pageId: the page id used to make the request (pageHandle sanitized).
   * @return {boolean}  `false` if the `pageHandle` is not a valid facebook page URL or id, `true` otherwise.
   */
  getPagePicture: function(pageHandle, callback){
    var pageId = sanitizePageHandle(pageHandle);

    if (!pageId) {
      sails.log.error(`idOrUrl parameter must be either a Facebook page URL or a Facebook username. "${pageHandle}" given.`);

      return false;
    }

    graph.get(`${pageId}/picture`, {
      width:  512,
      height: 512,
    }, function(err, data){
      callback(err, data, pageId);
    });

    return true;
  },
};

function sanitizePageHandle(pageHandle){
  var matches = pageHandle.match(/facebook.com(?:\/pages)?\/([A-Za-z0-9.-]{5,})\/?(?:\?fref=ts)?$/i)
                || pageHandle.match(/^([A-Za-z0-9.-]{5,})$/i);

  return (matches === null) ? false : matches[1];
}
