//----------------------------------------------------------------------------------------------------------------------
// A wrapper around the SSL communication for Precursors Server.
//
// @module ssl.js
//----------------------------------------------------------------------------------------------------------------------

var tls = require('tls');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var ns = require('../streams/netstring');
var JSONDecodeStream = require('../streams/json');
var Promise = require('../promise');

//----------------------------------------------------------------------------------------------------------------------

function SSLTransport()
{
    EventEmitter.call(this);
} // end SSLTransport

util.inherits(SSLTransport, EventEmitter);

SSLTransport.prototype.connect = function(host, port)
{
    var self = this;

    return new Promise(function(resolve, reject)
    {
        self.tcp = tls.connect({ host:host, port:port, rejectUnauthorized: false, secureProtocol: 'SSLv3_method' }, function()
        {
            // This is important! Otherwise we get Buffer objects back!
            self.tcp.setEncoding('utf8');

            // Build our intermediate streams
            self.nsEncode = new ns.NSEncodeStream();
            self.nsDecode = new ns.NSDecodeStream();
            self.jsonDecode = new JSONDecodeStream();

            // Connect pipes
            self.tcp.pipe(self.nsDecode);
            self.nsDecode.pipe(self.jsonDecode);
            self.nsEncode.pipe(self.tcp);

            // Connect message handling
            self.jsonDecode.on('data', self.handleMessages.bind(self));

            // Let the client know we've connected on ssl.
            self.emit('connected');

            resolve();
        });

        self.tcp.on('clientError', function(error)
        {
            console.log('TLS Client Error:', error);
        });

        self.tcp.on('error', function(error)
        {
            console.log('TLS Error:', error);
        });

        self.tcp.on('end', function()
        {
            console.log('TLS connection closed');
        });
    });
}; // end connect

SSLTransport.prototype.send = function(msg)
{
    this.nsEncode.write(JSON.stringify(msg));
}; // end send

SSLTransport.prototype.handleMessages = function(message)
{
    this.emit('message', message);
}; // end handleMessages

//----------------------------------------------------------------------------------------------------------------------

module.exports = SSLTransport;

//----------------------------------------------------------------------------------------------------------------------
