# Node Precursors

This is a simple communication library for the precursors server. It has been designed to make things as straightforward 
as possible, using things that should be very familiar to node developers.

## Client Type

First things first, you need to pick which client type you want to use. You choices are as follows:

* Game Client
    * Can only have one connected per account.
    * Can control the player's avatar.
    * Complete access to all functions.
    * Useful for official client replacements.
* Service Client
    * Can have many connected per account.
    * Cannot affect in-game state, such as movement, etc.
    * Limited access to functionality.
    * Useful for management tools or websites.
    
_Note: At the moment, the only supported client is the Game Client. Once service client support is added to precursors 
server, you will be able to use it._

## Connecting

Regardless of which client you choose, you connect the same way:

```javascript
var prelib = require('precursors');

var client = new prelib.GameClient('localhost', 6006);

client.connect('test@test.com', 'pass123')
    .then(function()
    {
        console.log('Completely Connected.');
    })
    .catch(prelib.errors.RequestDenied, function(message)
    {
        console.log('Failed to log in:', message.reason);
    });
```

The `connect` method of the client returns a promise, so you can easily chain it with other promises.

### Custom Errors

As you will notice in the example, we use a custom error `RequestDenied` to indicate that the request (in this case, 
the login) was denied.

## Channels

Once you have a connection to the server, you then will need to create a channel object:

```javascript
var channel = client.channel('control');
```

### Listening for events

Now that you have a channel, you can listen for events. We emit them based on their 'type' in precursors server.

```javascript
channel.on('setZone', function(message)
{
    // Would set the client's new zone here.
});
```

If, however, you need to listen on a more low level, you can listen for the 'event' event, which is fired internally. 
This gives you the ability to handle the message before it is unwrapped or routed.

### Sending events

Sending an event is simple:

```javascript
// Send a command event
channel.event({ type: 'command', name: 'remove' });

// Send a command event over TCP
channel.event({ type: 'command', name: 'remove' }, 'tcp');
```

By default, all events and requests are sent over SSL. However, this isn't desirable for things like input events. This 
is why we allow for you to send events over the TCP channel by passing the string `'tcp'` as the second parameter.

### Requests

Working with requests is made easy, using promises. Like events, You send your message and (optionally) the transport 
as a string:

```javascript
var loginMsg = {
    type: 'login',
    clientName: 'My Client',
    clientType: 'game',
    version: '0.1.0',
    user: 'test',
    password: 'pass1234',
    key: 'random 16bit Key',
    vector: 'random 16bit IV'
};

// Send the request and handle the response
channel.request(loginMsg)
    .then(function(response)
    {
        // handle request being confirmed
    })
    .catch(prelib.errors.RequestDenied, function(message)
    {
        // Handle request being denied 
        console.log('Failed to log in:', message.reason);
    })
    .catch(function(error)
    {
        // Handle Errors
    });
```

As you can see, `request` returns a promise that is only resolved if the request is confirmed. Otherwise you will need 
to catch the custom `RequestDenied` error. Denied requests should have a human-readable reason in the `reason` property 
of the message.