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



    var _create = function(model, content, options) {

        model.set('id', content.items.length + 1);

        var modelData = model.toJSON();
        content.items.push(modelData);

        _syncModel('read', model, modelData, options);

        return content;
    };

    var _update = function(model, content, options) {

        var modelData = model.toJSON();
            content.items = _(content.items).map(function(item) {
                if (item[model.idAttribute] == modelData[model.idAttribute]) item = modelData;
                return item;
            });

        _syncModel('saved', model, modelData, options);

        return content;
    };

    var _delete = function(model, content, options) {

        var modelData = model.toJSON();
        content.items = _(content.items).reject(function(item) {
            return item[model.idAttribute] == model.attributes[model.idAttribute];
        });

        _syncModel('deleted', model, modelData, options);

        return content;
    };


    var fileCache = null;

    var que = {};
    var executeQue = _.debounce(function(store, options) {

        _readFile(store)
            .fail(options.error)
            .done(function(fileContent) {

                fileCache = fileContent;

                var content = {current:0,items:[]};
                if (fileContent.length !== 0) {
                    content = JSON.parse(fileContent);
                }

                var queItem;
                while(queItem = que[store].pop()) {

                    if (queItem['create'] !== void 0) content = _create(queItem['create'], content, options);
                    if (queItem['update'] !== void 0) content = _update(queItem['update'], content, options);
                    if (queItem['delete'] !== void 0) content = _delete(queItem['delete'], content, options);
                }

                content.current = content.items.length;

                fileCache = null;
                _writeToFile(store, JSON.stringify(content))
                    .fail(options.error());
            });
    }, 600);


    /**
     * sync method
     * @params method, model, options
     */
    return function(method, model, options) {

        options         = options           || {};
        options.success = options.success   || function() {};

        var storeFilename = model.store + '.json';

        //no nead for que if read
        if (method === 'read') {
            readData(storeFilename, model, options);
            return true;
        }

        //init que data
        if (que[storeFilename] === void 0) que[storeFilename] = [];

        //generate que item
        var queItem = {};
            queItem[method] = model;

        //add to que
        que[storeFilename].push(queItem);

        // if file in cache only add to que
        if (fileCache !== null) return true;

        //handle que values
        executeQue(storeFilename, options);
    };
};