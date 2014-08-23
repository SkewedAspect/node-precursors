//----------------------------------------------------------------------------------------------------------------------
// Represents a 'channel' in the context of the Precursors networking protocol
//
// @module channel.js
//----------------------------------------------------------------------------------------------------------------------

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Puid = require('puid');

var Promise = require('./promise');
var errors = require('./errors');

//----------------------------------------------------------------------------------------------------------------------

function Channel(name, ssl, tcp)
{
    EventEmitter.call(this);

    this.puid = new Puid(false);
    this.name = name;
    this.ssl = ssl;
    this.tcp = tcp;

    this._init();
} // end Channel

util.inherits(Channel, EventEmitter);

Channel.prototype._init = function()
{
    if(this.ssl)
    {
        this.ssl.on('message', this._handleMessages.bind(this));
    } // end if

    if(this.tcp)
    {
        this.tcp.on('message', this._handleMessages.bind(this));
    } // end if

    // Listen for our low-level 'event' event and process it as a more specific event.
    this.on('event', this._handleEvents.bind(this));
}; // end _init

Channel.prototype._handleMessages = function(message)
{
    if(message.channel == this.name)
    {
        // We emit a low-level 'event' or 'response' message, but we also listen for these and emit
        // more specific events.
        this.emit(message.type, message);
    } // end if
}; // end _handleMessages

Channel.prototype._handleEvents = function(message)
{
    // Unwrap the message from the envelope, and emit it.
    this.emit(message.contents.type, message.contents);
}; // end _handleEvents

//----------------------------------------------------------------------------------------------------------------------

Channel.prototype.event = function(event, transport)
{
    var envelope = {
        type: 'event',
        contents: event,
        channel: this.name
    }; // end envelope

    // Pick the transport, and send the message.
    switch(transport)
    {
        case 'unencrypted':
            this.tcp.sendRaw(envelope);
            break;

        case 'tcp':
            this.tcp.send(envelope);
            break;

        case 'ssl':
        default:
            this.ssl.send(envelope);
            break;
    } // end switch
}; // end event

Channel.prototype.request = function(request, transport)
{
    var self = this;

    var envelope = {
        id: this.puid.generate(),
        type: 'request',
        contents: request,
        channel: this.name
    }; // end envelope

    // Pick the transport, and send the message.
    switch(transport)
    {
        case 'unencrypted':
            this.tcp.sendRaw(envelope);
            break;

        case 'tcp':
            this.tcp.send(envelope);
            break;

        case 'ssl':
        default:
            this.ssl.send(envelope);
            break;
    } // end switch

    // We return a promise to make it easier to work with requests
    return new Promise(function(resolve, reject)
    {
        function handleResponse(message)
        {
            if(message.id == envelope.id)
            {
                // Clean up our listener
                this.removeListener('response', handleResponse.bind(self));

                // Resolve/reject based on the confirmation flag.
                if(message.contents.confirm)
                {
                    resolve(message.contents);
                }
                else
                {
                    reject(new errors.RequestDenied(message.contents));
                } // end if
            } // end if
        } // end handleResponse

        self.on('response', handleResponse.bind(self));
    });
}; // end request

//----------------------------------------------------------------------------------------------------------------------

module.exports = Channel;

//----------------------------------------------------------------------------------------------------------------------