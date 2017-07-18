const { ipcRenderer } = require("electron");
const ContentType = require("./Clipboard").ContentType;

const createElement = str => {
    let div = document.createElement("div");
    div.innerHTML = str;
    return div.firstChild;
};

class FullTextWindowController {

    constructor() {
        this.currentEntry = null;
        this.maxImageWidth = 1000;
    }

    init() {        
        ipcRenderer.on("display-full-text", (evt, entry) => this._renderChosenEntry(entry));        
    }

    _renderChosenEntry(entry) {
        this.currentEntry = entry;
        this._renderDisplayModes(this.currentEntry.contentType);
        this._renderCurrentEntryBasedOnContentType(this.currentEntry.contentType);
        this._markSelectedContentType(this.currentEntry.contentType);
    }

    _renderDisplayModes(contentType) {

        const contentModesShelf = document.getElementById("contentModes");
        contentModesShelf.innerHTML = "";

        switch (contentType) {
            case ContentType.Html:
                let htmlTag = createElement(`<span class="mode" id="${ContentType.Html}">HTML</span>`);
                htmlTag.addEventListener("click", this._modeClickEvent.bind(this));
                contentModesShelf.appendChild(htmlTag);
            case ContentType.Text:
                let textTag = createElement(`<span class="mode" id="${ContentType.Text}">Text</span>`);
                textTag.addEventListener("click", this._modeClickEvent.bind(this));
                contentModesShelf.appendChild(textTag);
                break;

            case ContentType.Image:
                let imageTag = createElement(`<span class="mode" id="${ContentType.Image}">Image</span>`);
                imageTag.addEventListener("click", this._modeClickEvent.bind(this));
                contentModesShelf.appendChild(imageTag);
                break;
        }
    }

    _modeClickEvent(evt) {

        this._unselectAllModes();
        evt.target.classList.add("active");
        let chosenContentType = +evt.target.id;
        this._renderCurrentEntryBasedOnContentType(chosenContentType);   
        
    }

    _renderCurrentEntryBasedOnContentType(contentType) {

        switch(contentType) {

            case ContentType.Html: 
                this._displayHtmlEntry(this.currentEntry);
                break;

            case ContentType.Text:
                this._displayTextEntry(this.currentEntry);
                break;

            case ContentType.Image:
                this._displayImageEntry(this.currentEntry);
                break;
        }
    }

    _markSelectedContentType(contentType) {
        document.getElementById(contentType).classList.add("active");
    }

    _displayHtmlEntry(entry) {
        let html = document.getElementById("contentText");
        html.innerHTML = entry.html;
        html.style.display = "inline";
        document.getElementById("contentImage").style.display = "none";
    }

    _displayTextEntry(entry) {
        let text = document.getElementById("contentText");
        text.innerText = entry.text;
        text.style.display = "inline";
        document.getElementById("contentImage").style.display = "none";
    }

    _displayImageEntry(entry) {
        let img = document.getElementById("contentImage");
        img.src = entry.imageData.base64;
        img.width = this.maxImageWidth;
        img.height = this.maxImageWidth / entry.imageData.aspectRatio;
        img.style.display = "inline";
        document.getElementById("contentText").style.display = "none";
    }

    _unselectAllModes() {
        var modes = document.getElementsByClassName("mode");
        for (let i = 0; i < modes.length; ++i) {
            modes[i].classList.remove("active");
        }
    }
}

let window = (new FullTextWindowController()).init();