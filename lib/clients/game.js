//----------------------------------------------------------------------------------------------------------------------
// Represents a full game client connection to the Precursors Server. This means that the client _must_ connect to TCP,
// and the server will add the player's avatar to the world. This client type should only be used if you are writing
// a client to _replace_ the official client. Otherwise, you should instead use the service client.
//
// Note: Only one game client can be connected _per account_.
//
// @module game.js
//----------------------------------------------------------------------------------------------------------------------

var SSLTransport = require('../transports/ssl');
var TCPTransport = require('../transports/tcp');
var Channel = require('../channel');
var clientInfo = require('./info');
var errors = require('../errors');

//----------------------------------------------------------------------------------------------------------------------

function GameClient(host, port)
{
    this.ssl = new SSLTransport();
    this.tcp = new TCPTransport();

    this.host = host;
    this.port = port;

    // We will need a control channel for login, etc.
    this.controlChannel = this.channel('control');
} // end GameClient

GameClient.prototype._init = function()
{
    //TODO: Listen for errors and end events.
}; // end _init

GameClient.prototype.connect = function(username, password)
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
            .then(function(response)
            {
                return self.tcp.connect(self.host, response.tcpPort)
                    .then(function()
                    {
                        var cookieMsg = {
                            cookie: response.cookie,
                            type: 'connect'
                        };

                        return self.controlChannel.request(cookieMsg, 'unencrypted');
                    });
            })
            .catch(errors.RequestDenied, function(error)
            {
                console.error('Login denied:', error.message.reason);

                throw error;
            });
    });
}; // end connect

GameClient.prototype.disconnect = function()
{
    this.controlChannel.event({ type: "logout" });
}; // end disconnect

GameClient.prototype.channel = function(channel)
{
    return new Channel(channel, this.ssl, this.tcp);
}; // end channel

//----------------------------------------------------------------------------------------------------------------------

module.exports = GameClient;

//----------------------------------------------------------------------------------------------------------------------