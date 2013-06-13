backbone-dropbox.js
===================

backbone-dropbox.js is a sync adapter for [dropbox.js](https://github.com/dropbox/dropbox-js). Using this sync, backbone will CRUD your models in a JSON file within your dropbox. This can be used for single user applications e.g. todo-list or feed reader.

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

Now you have to authenticate. Therefor dropbox.js provides several [authentication methods](https://github.com/dropbox/dropbox-js/blob/master/doc/auth_drivers.md). For browser apps it's applicable to use

Redirect (user leaves your app and comes back):

    drpbxClient.authDriver(new Dropbox.Drivers.Redirect());

or Popup:

    drpbxClient.authDriver(new Dropbox.Drivers.Popup({
        receiverUrl: "https://url.to/oauth_receiver.html",
        rememberUser: true|false
    }));

Next, overwrite Backbone.sync

    Backbone.sync = DropboxSync(drpbxClient);

and let the user authenticate (via Redirect or Popup)

    drpbxClient.authenticate({interactive: true}, function(error, client) {

        if (error) {
            throw new Error('Dropbox auth error: ' + error.status);
        }

        // Init/Start your app.
    });
    
Your models and collections will now sync with your dropbox.

    var myModel = Backbone.Model.extend({
        store: 'myModel',
        defaults: {
            // ...
        }
    });
    
    var myCollection = Backbone.Collection.extend({
        model: myModel,
        store: 'myModel'
    });
    
The last thing you have to do is create an empty [myModel.json](https://raw.github.com/jay-doubleyou/backbone-dropbox.js/master/myModel.json) in your app dropbox folder.


backbone-dropbox.js is distributed under the [MIT License](http://opensource.org/licenses/MIT).
