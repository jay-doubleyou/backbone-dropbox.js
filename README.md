backbone-dropbox.js
===================

backbone.sync adapter [for dropbox.js](https://github.com/dropbox/dropbox-js).

Usage
-----

Include the dropbox.js script:

    <script src="//cdnjs.cloudflare.com/ajax/libs/dropbox.js/0.9.2/dropbox.min.js">
</script>


Create the dropbox client:

    var drpbxClient = new Dropbox.Client({
        key: 'YOUR_ENCRYPTED_API_KEY', sandbox: true|false
    });
    
You can create your API key [Dropbox App Console](https://www.dropbox.com/developers/apps).

If your app runs inside the browser, you have to [encrypt the API key](https://dl-web.dropbox.com/spa/pjlfdak1tmznswp/api_keys.js/public/index.html).

Now you have to authenticate. dropbox.js provides several [authentication methods](https://github.com/dropbox/dropbox-js/blob/master/doc/auth_drivers.md). For browser apps it's applicable to use

    drpbxClient.authDriver(new Dropbox.Drivers.Redirect());

or

    drpbxClient.authDriver(new Dropbox.Drivers.Popup({
        receiverUrl: "https://url.to/oauth_receiver.html",
        rememberUser: true|false
    }));

Next, overwrite Backbone.sync

    Backbone.sync = DropboxSync(drpbxClient);

and authenticate the user

    drpbxClient.authenticate({interactive: true}, function(error, client) {

        if (error) {
            throw new Error('Dropbox auth error: ' + error.status);
        }

        // Init/Start your app.
    });
