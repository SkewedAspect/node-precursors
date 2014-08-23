//----------------------------------------------------------------------------------------------------------------------
// Represents a service game client connection to the Precursors Server. This means that the client _only_ connects via
// SSL. The client also will ignore any game-state related changes, such as movement. If you would like to make a
// replacement for the official client, you should use the game client.
//
// Note: You may connect as many service clients with the same account credentials as you wish.
//
// @module game.js
//----------------------------------------------------------------------------------------------------------------------

var SSLTransport = require('../transports/ssl');
var TCPTransport = require('../transports/tcp');
var Channel = require('../channel');
var clientInfo = require('./info');
var errors = require('../errors');

//----------------------------------------------------------------------------------------------------------------------

function ServiceClient(host, port)
{
    this.ssl = new SSLTransport();
    this.tcp = new TCPTransport();

    this.host = host;
    this.port = port;

    // We will need a control channel for login, etc.
    this.controlChannel = this.channel('control');
} // end ServiceClient

ServiceClient.prototype._init = function()
{
    //TODO: Listen for errors and end events.
}; // end _init

ServiceClient.prototype.connect = function(username, password)
{
    var self = this;

    var loginMsg = {
        type: 'login',
        clientName: clientInfo.name,
        clientType: 'game',
        version: clientInfo.version,
        user: username,
        password: password,
        key: this.tcp.key.toString('base64'),
        vector: this.tcp.vector.toString('base64')
    };

    return this.ssl.connect(this.host, this.port).then(function()
    {
        return self.controlChannel.request(loginMsg, 'ssl')
            .catch(errors.RequestDenied, function(error)
            {
                console.error('Login denied:', error.message.reason);

                throw error;
            });
    });
}; // end connect

ServiceClient.prototype.channel = function(channel)
{
    return new Channel(channel, this.ssl, this.tcp);
}; // end channel

//----------------------------------------------------------------------------------------------------------------------

module.exports = ServiceClient;

//----------------------------------------------------------------------------------------------------------------------
