const { ipcRenderer } = require("electron");
const ContentType = require("./Clipboard").ContentType;

const createElement = str => {
    let div = document.createElement("div");
    div.innerHTML = str;
    return div.firstChild;
};

class MainWindowController {

    constructor() {
        this.stack = [];
        this.pinnedItems = [];
        this.imgSearchResults = ["img", "image", "jpg", "jpeg", "png", ""];
        this._isMoving = false;
    }

    init() {
        this._registerMainListeners();
        this._initWindowPositionPolling();
    }

    _registerMainListeners() {

        ipcRenderer.on("clear-history", this._clearHistoryEntries.bind(this));
        ipcRenderer.on("refresh-history", this._refreshHistory.bind(this));

        let timeoutID = 0;
        let searchInput = document.getElementById("searchInput");
        searchInput.addEventListener("keyup",evt => {
            clearTimeout(timeoutID);
            timeoutID = setTimeout(_ => this._filterHistory(searchInput.value.trim()), 300);
        });

        ipcRenderer.on("update-active-content", (evt, index) => {
            this._unselectAll();
            let list = document.getElementsByClassName("clipboardItem");
            let item = list[index];
            item.classList.add("active");
        });
    }

    _refreshHistory(evt, newStack) {

        this.stack = newStack;
        this._clearHistoryEntries();
        this.stack.forEach((content, index) => this._insertHistoryEntry(content, index));
    }

    _insertHistoryEntry(entry, index) {
        
        //let menuTag = createElement(`<span class="menuIcon">...</span>`);

        let searchTag  = createElement(`<span class="menuIcon">...</span>`);//createElement(`<span class="searchIcon"><i class='fa fa-search'></i></span>`);
        //searchTag.addEventListener("click", _ => ipcRenderer.send("display-full-text-window", index) );

        let contentTag = createElement(`<li class="clipboardItem"></li>`);
        let thumbtack = createElement(`<span  class="thumbtack"><i class="fa fa-thumb-tack"></i></span>`);
        thumbtack.addEventListener("click", _ => this._thumbtackClick(thumbtack, entry, index));
        entry.isPinned && thumbtack.classList.add("pinned");
        contentTag.appendChild(thumbtack);
        contentTag.appendChild(this._getShortcutTag(index));
        contentTag.appendChild(this._getContentHtml(entry));
        contentTag.appendChild(searchTag);
        contentTag.addEventListener("dblclick", _ => this._dblclickItem(contentTag, index));
        index === 0 && contentTag.classList.add("active");
        document.getElementById("list").appendChild(contentTag);
        entry.contentType == ContentType.Image && contentTag.classList.add("image-content");
    }

    _thumbtackClick(thumbtack, entry, index) {

        ipcRenderer.send("pin-entry", index);
        entry.isPinned = !entry.isPinned;
        entry.isPinned ? thumbtack.classList.remove("pinned") : thumbtack.classList.add("pinned");

    }

    _getShortcutTag(index) {
        let shorcutKeys = (index < 9) ? `Ctrl+${index + 1}` : "";
        return createElement(`<span class="shortcut">${shorcutKeys}</span>`);
    }

    _getContentHtml(content) {

        switch (content.contentType) {
            case ContentType.Text:
            case ContentType.Html:
                return createElement(`<input class="itemValue" type="text" value="${this._trimTextContent(content.text)}" />`);
            case ContentType.Image:
                return createElement(`<span class="itemValue"><img src="${content.imageData.base64}" width="100" height="100" /></span>`);           
        }
    }

    _dblclickItem(htmlElement, index) {

        this._unselectAll();
        htmlElement.classList.add("active");
        ipcRenderer.send("set-clipboard", index);
    }

    _clearHistoryEntries() {

        document.getElementById("list").innerHTML = "";
    }

    _unselectAll() {

        let entries = document.getElementsByClassName("clipboardItem");
        for (let i = 0; i < entries.length; ++i) {
            entries[i].classList.remove("active");
        }
    }

    _filterHistory(text) {

        if (!text) {
            this._showAllEntries();
            return;
        }

        let entries = document.getElementsByClassName("clipboardItem");
        this._hideAllEntries();
        this.stack.forEach((entry, index) => {     
            if (entry.contentType === ContentType.Text && entry.text.indexOf(text) >= 0) {
                entries[index].style.display = "inline-block";
            }
            if (entry.contentType === ContentType.Html && entry.html.indexOf(text) >= 0) {
                entries[index].style.display = "inline-block";
            }
            if (entry.contentType === ContentType.Image && this.imgSearchResults.indexOf(text) >= 0) {
                entries[index].style.display = "inline-block";
            }
        });

    }

    _showAllEntries() {
        let entries = document.getElementsByClassName("clipboardItem");
        for (let i = 0; i < entries.length; ++i) {
            entries[i].style.display = "inline-block";
        }
    }

    _hideAllEntries() {

        let entries = document.getElementsByClassName("clipboardItem");
        for (let i = 0; i < entries.length; ++i) {
            entries[i].style.display = "none";
        }
    }

    _trimTextContent(text) { 
        const doubleSpaces = /\s{2,}/g;
        const maxTextSummaryLength = 100;       
        let trimmedText = text.replace(doubleSpaces, "").trim();
        return trimmedText.substr(0, maxTextSummaryLength) + (trimmedText.length > maxTextSummaryLength ?  " ..." : "");
    };

    _initWindowPositionPolling() {

        let lastScreenX;
        let lastScreenY;
        setInterval(() => {
            if (lastScreenX !== window.screenX || lastScreenY !== window.screenY) {
                lastScreenY = window.screenY;
                lastScreenX = window.screenX;
                this._isMoving = true;
                this._onScreenMove();
            }
            else if (this._isMoving) {
                this._isMoving = false;
                this._onScreenStopMoving();
            }
        }, 1000);
    }

    _onScreenMove() {
        ipcRenderer.send("window-move", true);
    }

    _onScreenStopMoving() {
        ipcRenderer.send("window-moved", true);
    }

};

var controller = (new MainWindowController()).init();