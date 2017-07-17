const { clipboard } = require("electron");

const ContentType = { Text: 0, Html: 1, Image: 2 };

class Clipboard {

    constructor() {

        this.callbacks = [];

        this.currentClipboardContentType = 0;

        this._currentClipboardText = null;

        this._currentClipboardHtml = null;
        
        this._currentClipboardImage = null;

        this.latestTextEntry = null;

        this.latestHtmlEntry = null;

        this.latestImageEntry = null;

        this._intervalId = 0;

        this._isManualySettingClipboard = false;

        this.clear();
        this._initPolling();
    }

    onChange(callback) {
        if (callback && this.callbacks.indexOf(callback) < 0) {
            this.callbacks.push(callback);
        }                
    }

    offChange(callback) {
        if (this.callbacks.indexOf(callback) >= 0) {
            this.callbacks.splice(this.callbacks.indexOf(callback), 1);
        }
    }

    write(data) {
        this._isManualySettingClipboard = true;
        clipboard.write(data);
    }

    clear() {
        clipboard.clear();
    }

    _initPolling() {

        this._readCurrentEntry();

        this._intervalId = setInterval(delta => {
            
            this._readCurrentEntry();

            if (this._isManualySettingClipboard) {
                this._equalizeEntries();
                this._isManualySettingClipboard = false;
                return;
            }

            if (!this._hasClipboardContentChanged()) {
                return;
            }

            this._updateLatestEntry();

            // send event clipboard changed with changed data
            this.callbacks.forEach((callback, index) => callback.call(this, this._getClipboardChangedData()));            

        }, 500);
    }
    
    _getClipboardChangedData() {        

        let result = {};
        result.contentType = this.currentClipboardContentType;
        switch (this.currentClipboardContentType) {                        

            case ContentType.Html:
                result.html = this._currentClipboardHtml;

            case ContentType.Text:
                result.text = this._currentClipboardText;
                break;

            case ContentType.Image:
                result.image = this._currentClipboardImage;
                result.imageData = {
                    base64:      this._currentClipboardImage.toDataURL(),
                    size:        this._currentClipboardImage.getSize(),
                    aspectRatio: this._currentClipboardImage.getAspectRatio()
                };
                result.image64 = this._currentClipboardImage.toDataURL();
                break;
        }
        return result;
    }

    _readCurrentEntry() {

        this._currentClipboardText = clipboard.readText();
        this._currentClipboardHtml = clipboard.readHTML();        
        this._currentClipboardImage = clipboard.readImage();
        this.currentClipboardContentType = this._getClipboardContentType();
    }

    _equalizeEntries() {

        this.latestTextEntry = this._currentClipboardText;
        this.latestHtmlEntry = this._currentClipboardHtml;        
        this.latestImageEntry =  this._currentClipboardImage;
    }

    _updateLatestEntry() {

        switch (this.currentClipboardContentType) {                        

            case ContentType.Html:
                this.latestHtmlEntry = this._currentClipboardHtml;

            case ContentType.Text:
                this.latestTextEntry = this._currentClipboardText;
                break;

            case ContentType.Image:
                this.latestImageEntry = this._currentClipboardImage;
                break;
        }
    }

    _hasClipboardContentChanged() {        

        switch (this.currentClipboardContentType) {
            case ContentType.Text:
                return this._hasClipboardTextChanged();
            case ContentType.Html:
                return this._hasClipboardHtmlChanged();
            case ContentType.Image:
                return this._hasClipboardImageChanged();
            default:
                return false;
        }
    }

    _hasClipboardImageChanged() {            
        return (this._currentClipboardImage && !this.latestImageEntry)
            || this.latestImageEntry.toDataURL() !== this._currentClipboardImage.toDataURL();        
    }

    _hasClipboardTextChanged() {
        return this._currentClipboardText 
            && this._currentClipboardText.trim() 
            && this.latestTextEntry !== this._currentClipboardText;
    }

    _hasClipboardHtmlChanged() {
        return this.latestHtmlEntry !== this._currentClipboardHtml;
    }

    _getClipboardContentType() {

        if (this._currentClipboardHtml) {
            return ContentType.Html;
        }
        if (!this._currentClipboardImage.isEmpty()) {
            return ContentType.Image;
        }
        return ContentType.Text;
    }
};

Clipboard.ContentType = ContentType;

module.exports = Clipboard;