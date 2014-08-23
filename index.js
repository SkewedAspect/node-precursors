//----------------------------------------------------------------------------------------------------------------------
// A library for communicating with the Precursors MMORPG Server.
//
// @module index.js
//----------------------------------------------------------------------------------------------------------------------

var errors = require('./lib/errors');
var GameClient = require('./lib/clients/game');
var ServiceClient = require('./lib/clients/service');

//----------------------------------------------------------------------------------------------------------------------

module.exports = {
    GameClient: GameClient,
    ServiceClient: ServiceClient,
    errors: errors
}; // end exports

//----------------------------------------------------------------------------------------------------------------------