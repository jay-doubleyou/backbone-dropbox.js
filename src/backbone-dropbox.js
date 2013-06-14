;var DropboxSync = function(dropboxClient) {

    "use strict";

    if (dropboxClient == void 0) {
        throw new Error('no dropbox client');
    }

    if (false === (dropboxClient instanceof Dropbox.Client)) {
        throw new Error('invalid dropbox client');
    }

    var _handleDropboxError = function(error) {

        switch (error.status) {
            case Dropbox.ApiError.INVALID_TOKEN:
                alert('INVALID_TOKEN: auth again');
            break;

            case Dropbox.ApiError.NOT_FOUND:
                alert('NOT_FOUND');
            break;

            case Dropbox.ApiError.OVER_QUOTA:
                alert('OVER_QUOTA');
            break;

            case Dropbox.ApiError.RATE_LIMITED:
                alert('RATE_LIMITED');
            break;

            case Dropbox.ApiError.NETWORK_ERROR:
                alert('NETWORK_ERROR');
                break;

            case Dropbox.ApiError.INVALID_PARAM:
                alert('INVALID_PARAM');
                break;

            case Dropbox.ApiError.OAUTH_ERROR:
                alert('OAUTH_ERROR');
                break;

            case Dropbox.ApiError.INVALID_METHOD:
                alert('INVALID_METHOD');
                break;

            default:
                alert('ERROR', error.status);
                break;
            }
    };

    var _writeToFile = _.debounce(function(filename) {

        var d = $.Deferred();
        dropboxClient.writeFile(filename, JSON.stringify(contentCache), function(error, stat) {

            if (error) {
                console.log('error writing', filename, error);
                d.reject(error);
            }
            else {
                d.resolve(stat);
            }

            return true;
        });
        return d;
    }, 600);


    var contentCache = null;
    var defaultEmptyJson = {
        current:0,
        items:[]
    };


    var _readFile = function(filename, opts) {

        opts = opts || {};

        var d = $.Deferred();
        if ((opts.resetCache === void 0  || opts.resetCache === false) &&
            contentCache    !== null) {
            d.resolve();
        } else {

            dropboxClient.readFile(filename, function(error, fileContent) {
                if (error) d.reject(error);
                else {

                    var data = defaultEmptyJson;
                    if (fileContent.length !== 0) {
                        data = JSON.parse(fileContent);
                    }

                    //save to cache
                    contentCache = data;

                    d.resolve();
                }
            });
        }

        return d;
    };

    /*
     * Trigger sync event, trigger finishing event (created, read, saved, deleted), call success callback
     */
    var _syncModel = function(eventName, model, items, options) {
        model.trigger('sync', model, items, options);
        model.trigger(eventName, model);
        options.success(items);
        return true;
    };


    function _read(model, options) {

        // Nothing to do because no model id given.
        if (model instanceof Backbone.Model &&
            model.attributes[model.idAttribute] == void 0) {
            return _syncModel('read', model, [], options);
        }

        //no content
        if (contentCache.current === 0) {
            return _syncModel('read', model, [], options);
        }

        //get items
        var items = contentCache.items;

        //handle if model is collection
        if (model instanceof Backbone.Collection) {

            // Apply filter
            if (options.filter != void 0) {
                items = _(items).where(options.filter);
            }

            return _syncModel('read', model, items, options);
        }

        var search = {}, modelId = model.attributes[model.idAttribute];
            search[model.idAttribute] = modelId;

        var item = _(items).findWhere(search);
        if (item == void 0) {
            options.error('Model not found by ID ' + modelId);
            return true;
        }

        return _syncModel('read', model, item, options);
    }

    function _create(model, options) {

        var new_id = contentCache.current;
        var modelWithId = _.findWhere(contentCache.items, {
            id : new_id
        });

        if (modelWithId !== void 0) {
            new_id++;
        }

        model.set('id', new_id);

        var modelData = model.toJSON();
        contentCache.items.push(modelData);

        return _syncModel('read', model, modelData, options);
    }

    function _update(model, options) {

        var modelData = model.toJSON();

            contentCache.items = _(contentCache.items).map(function(item) {
                if (item[model.idAttribute] == modelData[model.idAttribute]) {
                    item = modelData;
                }
                return item;
            });

        return _syncModel('saved', model, modelData, options);
    }

    function _delete(model, options) {

        var modelData = model.toJSON();
        contentCache.items = _(contentCache.items).reject(function(item) {
            return item[model.idAttribute] == model.attributes[model.idAttribute];
        });

        return _syncModel('deleted', model, modelData, options);
    }


    /**
     * sync method
     * @params method, model, options
     */
    return function(method, model, options) {

        options         = options           || {};
        options.success = options.success   || function() {};
        options.error   = options.error     || function(error) {
            console.log(error);
        };

        var storeFilename = model.store + '.json';

        var that = this;
        _readFile(storeFilename, options)
            .fail(options.error)
            .done(function() {

                switch(method) {

                    case 'read'  : _read(model, options);   break;
                    case 'create': _create(model, options); break;
                    case 'update': _update(model, options); break;
                    case 'delete': _delete(model, options); break;
                }

                if (method !== 'read') {

                    //add current
                    contentCache.current = contentCache.items.length;

                    //write to file
                    _writeToFile(storeFilename);
                }
            });
    };
};