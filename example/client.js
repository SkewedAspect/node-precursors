// ---------------------------------------------------------------------------------------------------------------------
// A sample game client.
//
// @module client.js
// ---------------------------------------------------------------------------------------------------------------------

var prelib = require('../index.js');

// ---------------------------------------------------------------------------------------------------------------------

var client = new prelib.GameClient('localhost', 6006);

client.connect('test@test.com', '1234')
    .then(function()
    {
        console.log('Completely Connected.');
        // Time to send a useless message
        var chatChannel = client.channel('foobar');

        chatChannel.event({ message: "Foo!" });
    })
    .catch(prelib.errors.RequestDenied, function(message)
    {
        console.log('Failed to log in:', message.reason);
    });

// ---------------------------------------------------------------------------------------------------------------------