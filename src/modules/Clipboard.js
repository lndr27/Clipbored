const { clipboard, nativeImage } = require("electron");
const ContentType = { Text: 0, Html: 1, Image: 2 };

class Clipboard {

    constructor() {

        this.isPolling = false;

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

        this._intervalInMilliseconds = 1000;

        this._isReadingClipboard = false;

        this.clear();
        this.startPolling();
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

    startPolling() {

        if (this.isPolling) return;

        this.isPolling = true;

        this._readCurrentEntry();

        this._intervalId = setInterval(delta => {
            
            if (this._isReadingClipboard) {
                return;
            }

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

        }, this._intervalInMilliseconds);
    }
    
    stopPolling() {
        if (!this.isPolling) return;
        this.isPolling = false;
        clearInterval(this._intervalId);
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
                result.image = this._currentClipboardImage.nativeImage;
                result.imageData = {
                    base64:      this._currentClipboardImage.base64,
                    size:        this._currentClipboardImage.nativeImage.getSize(),
                    aspectRatio: this._currentClipboardImage.nativeImage.getAspectRatio()
                };
                break;
        }
        return result;
    }

    _readCurrentEntry() {

        this._isReadingClipboard = true;

        this.currentClipboardContentType = this._getClipboardContentType();
        switch (this.currentClipboardContentType) {
            case ContentType.Html:
                this._currentClipboardHtml = clipboard.readHTML();                          
            case ContentType.Text:
                this._currentClipboardText = clipboard.readText();
                break;
            case ContentType.Image:            
                let image = clipboard.readImage();
                this._currentClipboardImage = {
                     nativeImage: image,
                     base64: image.toDataURL()
                };            
                break;
        }

        this._isReadingClipboard = false;
    }

    _equalizeEntries() {

        this.latestTextEntry = this._currentClipboardText;
        this.latestHtmlEntry = this._currentClipboardHtml;        
        this.latestImageEntry = this._currentClipboardImage;
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

        if (this._currentClipboardImage && !this.latestImageEntry) {
            return true;
        }

        let imageA = this._currentClipboardImage.base64;
        let imageB = this.latestImageEntry.base64;
        if (imageA.length !== imageB.length) {
            return true;
        }
        if (imageA !== imageB) {
            return true;
        }

        return false;
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

        if (clipboard.readHTML()) {
            return ContentType.Html;
        }
        if (clipboard.readText()) {
            return ContentType.Text;    
        }
        if (!clipboard.readImage().isEmpty()) {
            return ContentType.Image;
        }
        return ContentType.Text;
    }
};

Clipboard.ContentType = ContentType;

module.exports = Clipboard;