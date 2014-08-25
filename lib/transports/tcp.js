//----------------------------------------------------------------------------------------------------------------------
// A wrapper around the TCP communication for Precursors Server.
//
// @module tcp
//----------------------------------------------------------------------------------------------------------------------

var net = require('net');
var crypto = require('crypto');

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var ns = require('../streams/netstring');
var JSONDecodeStream = require('../streams/json');
var Promise = require('../promise');

//----------------------------------------------------------------------------------------------------------------------

function TCPTransport()
{
    EventEmitter.call(this);

    this._initCryto();
} // end TCPTransport

util.inherits(TCPTransport, EventEmitter);

TCPTransport.prototype._initCryto = function()
{
    this.key = crypto.randomBytes(16);
    this.vector = crypto.randomBytes(16);

    this.aesDecrypt = crypto.createDecipheriv('AES-128-CBC', this.key, this.vector);

    // FIXME: We need to not throw an error on disconnect. Not sure why it does, even...
    this.aesDecrypt.on('error', function(error){ /* Skip errors so we don't report an error on disconnect */ });
}; // end _initCryto

TCPTransport.prototype.connect = function(host, port)
{
    var self = this;

    return new Promise(function(resolve, reject)
    {
        self.tcp = net.connect(port, host, function()
        {
            // This is important! Otherwise we get Buffer objects back!
            self.tcp.setEncoding('utf8');

            self.nsEncode = new ns.NSEncodeStream();
            self.nsDecode = new ns.NSDecodeStream();
            self.jsonDecode = new JSONDecodeStream();

            // Decode Pipes
            self.tcp.pipe(self.nsDecode);
            self.nsDecode.pipe(self.aesDecrypt);
            self.aesDecrypt.pipe(self.jsonDecode);

            // Encode Pipes
            //self.aesEncrypt.pipe(self.nsEncode);
            self.nsEncode.pipe(self.tcp);

            // Connect message handling
            self.jsonDecode.on('data', self.handleMessages.bind(self));

            // Let the client know we've connected on ssl.
            self.emit('connected');

            resolve();
        });

        self.tcp.on('clientError', function(error)
        {
            console.log('TCP Client Error:', error);
        });

        self.tcp.on('error', function(error)
        {
            console.log('TCP Error:', error);
        });

        self.tcp.on('end', function()
        {
            self.aesDecrypt.unpipe(self.jsonDecode);
            console.log('TCP connection closed');
        });
    });
}; // end connect

TCPTransport.prototype.send = function(msg)
{
    //TODO: Turn this into a transform stream that abstracts all this away.

    // We always need to make a new aes stream for every message.
    this.aesEncrypt = crypto.createCipheriv('AES-128-CBC', this.key, this.vector);

    // Get the cipher text, in 64 byte chunks.
    var buff = this.aesEncrypt.update(JSON.stringify(msg), 'utf8');
    buff = Buffer.concat([buff, this.aesEncrypt.final()]);

    // Send the concated cipher text
    this.nsEncode.write(buff);
}; // end send

TCPTransport.prototype.sendRaw = function(msg)
{
    // We send without encryption
    this.nsEncode.write(JSON.stringify(msg));
}; // end send

TCPTransport.prototype.handleMessages = function(message)
{
    this.emit('message', message);
}; // end handleMessages

//----------------------------------------------------------------------------------------------------------------------

module.exports = TCPTransport;

//----------------------------------------------------------------------------------------------------------------------
