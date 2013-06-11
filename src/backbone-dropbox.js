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

    var _writeToFile = function(filename, content) {

        var d = $.Deferred();
        dropboxClient.writeFile(filename, content, function(error, stat) {

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
    };

    var _readFile = function(filename) {

        var d = $.Deferred();
        dropboxClient.readFile(filename, function(error, data) {

            if (error) {
                console.log('Error reading file: ' + filename, error);
                d.reject(error);
            }
            else {
                d.resolve(data);
            }

            return true;
        });

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

    // read data
    var readData = function(storeFilename, model, options) {

        // Nothing to do because no model id given.
        if (model instanceof Backbone.Model && model.attributes[model.idAttribute] == void 0) {
            return _syncModel('read', model, [], options);
        }

        _readFile(storeFilename)
            .fail(options.error)
            .done(function(data) {

                var items = JSON.parse(data).items;

                if (model instanceof Backbone.Model) {

                    var search = {}, modelId = model.attributes[model.idAttribute];
                    search[model.idAttribute] = modelId;
                    var item = _(items).findWhere(search);

                    if (item == void 0) {
                        options.error('Model not found by ID ' + modelId);
                    }
                    else {
                        _syncModel('read', model, item, options);
                    }

                    return true;
                }

                if (model instanceof Backbone.Collection) {

                    // Apply filter
                    if (options.filter != void 0) {
                        items = _(items).where(options.filter);
                    }

                    return _syncModel('read', model, items, options);
                }
            });
    };

    //create new entries
    var createData = function(storeFilename, model, options) {

        var modelData = model.toJSON();
        console.log('create modelData', modelData);

        _readFile(storeFilename)
            .fail(options.error)
            .done(function(data) {

                data = JSON.parse(data);

                data.current++;
                modelData[model.idAttribute] = data.current;
                data.items.push(modelData);

                _writeToFile(storeFilename, JSON.stringify(data))
                    .fail(options.error)
                    .done(function() {
                        model.attributes[model.idAttribute] = data.current;
                        return _syncModel('read', model, modelData, options);
                    });
            });
    };

    //update existing entries
    var updateData = function(storeFilename, model, options) {

        var modelData = model.toJSON();

        _readFile(storeFilename)
            .fail(options.error)
            .done(function(data) {

                data = JSON.parse(data);
                data.items = _(data.items).map(function(item) {

                    if (item[model.idAttribute] == modelData[model.idAttribute]) {
                        item = modelData;
                    }

                    return item;
                });

                _writeToFile(storeFilename, JSON.stringify(data))
                    .fail(options.error)
                    .done(function() {
                        return _syncModel('saved', model, modelData, options);
                    });
            });
    };

    //delete existing entries
    var deleteData = function(storeFilename, model, options) {

        // Nothing to do because empty model given.
        if (model instanceof Backbone.Model && model.attributes[model.idAttribute] == void 0) {
            return _syncModel('deleted', model, [], options);
        }

        _readFile(storeFilename)
            .fail(options.error)
            .done(function(data) {

                var modelData = model.toJSON();

                data = JSON.parse(data);
                data.items = _(data.items).reject(function(item) {
                    return item[model.idAttribute] == model.attributes[model.idAttribute];
                });

                _writeToFile(storeFilename, JSON.stringify(data))
                    .fail(options.error)
                    .done(function() {
                        return _syncModel('deleted', model, modelData, options);
                    });
            });
    };

    /**
     * sync method
     * @params method, model, options
     */
    return function(method, model, options) {

        options         = options           || {};
        options.success = options.success   || function() {};

        var storeFilename = model.store + '.json';

        switch (method) {
            case 'read'  :  readData  (storeFilename, model, options);   break;
            case 'create':  createData(storeFilename, model, options);   break;
            case 'update':  updateData(storeFilename, model, options);   break;
            case 'delete':  deleteData(storeFilename, model, options);   break;
        }
    };
};