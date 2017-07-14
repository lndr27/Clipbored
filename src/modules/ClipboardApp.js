const {
    app,
    ipcMain,
    clipboard,
    globalShortcut,
    Menu,
    Tray,
    BrowserWindow
} = require("electron");

const __rootpath = `${__dirname}/..`;

const ContentType = { Text: 0, Html: 1, Image: 2 };

class ClipboardApp {

    constructor() {
        
        this.app = app;

        this.tray = null;

        this.window = null;

        this.fullTextWindow = null;

        this.stack = [];

        this.latestTextEntry = null;

        this.currentTextEntry = null;

        this.latestImageEntry = null;

        this.currentImageEntry = null;

        this.isSettingClipboard = false;

        this.icon = `${__rootpath}/resources/img/clipboard.ico`;
    }

    init() {

        this.app.on("ready", _ => {
            this.initTray();
            this.initWindow();
            this.initFullTextWindow();
            this.initClipboardPolling();
            this.initRendererListener();
            globalShortcut.unregisterAll();
        });
        this.app.on("will-quit", _ => {

        });        
    }

    initTray() {

        this.tray = new Tray(this.icon);
        this.tray.on("double-click", evt => this.window.show());
        this.tray.setContextMenu(Menu.buildFromTemplate([{ label: "Exit", click: this.closeApp.bind(this) }]));
    }

    initWindow() {

        this.window = new BrowserWindow({ width: 240, minWidth: 240, maxWidth: 500, minHeight: 500, icon: this.icon });
        //this.window.openDevTools();
        this.window.setAlwaysOnTop(true);
        this.window.loadURL(`${__rootpath}/views/index.html`);
        this.window.on("minimize", this.minimizeToTray.bind(this));
        this.window.on("close", this.minimizeToTray.bind(this));
        this.window.setMenu(Menu.buildFromTemplate([{
            label: "File",
            submenu: [
                { label: "Clear", click: this.clearClipboard.bind(this) },
                { label: "Always on top", click: this.toggleAlwaysOnTop.bind(this) },
                { type: "separator" },
                { label: "Exit", click: this.closeApp.bind(this) }
            ]
        }]));
    }

    initFullTextWindow(item) {

        this.fullTextWindow = new BrowserWindow({ width: 300, height: 300, icon: this.icon });
        //this.fullTextWindow.openDevTools();
        this.fullTextWindow.loadURL(`${__rootpath}/views/fullText.html`);        
        this.fullTextWindow.setMenu(null);  
        this.fullTextWindow.hide();
        this.fullTextWindow.on("close", evt => {
            evt.preventDefault();
            this.fullTextWindow.hide();
        });
    }

    initClipboardPolling() {

        this.latestTextEntry = clipboard.readText();
        this.intervalId = setInterval(this.checkClipboardChanged.bind(this), 500);
    }

    checkClipboardChanged() {

        this.currentTextEntry = clipboard.readText();
        this.currentImageEntry = clipboard.readImage();

        if (this.isSettingClipboard) {
            this.latestTextEntry = this.currentTextEntry;
            this.latestImageEntry = this.currentImageEntry;
            this.isSettingClipboard = false;
            return;
        }

        
        let hasClipboardChanged = this.currentTextEntry !== this.latestTextEntry && this.currentTextEntry.trim();

        if (hasClipboardChanged) {
            this.latestTextEntry = this.currentTextEntry;
            let entry = {
                text: clipboard.readText(),
                html: clipboard.readHTML(),
                image: clipboard.readImage()
            };
            this.clipboardChanged(entry);            
        }        
    }

    hasClipboardImageChanged() {            

        let currenImage = clipboard.readImage();
        if (currenImage.isEmpty()) {
            return false;
        }
        return this.latestImageEntry.toDataURL() !== currentImage;
    }

    hasClipboardTextChanged() {

    }

    getClipboardContentType() {

        let text = clipboard.readText();

    }

    clipboardChanged(entry) {

        this.stack.unshift(entry);
        this.setShorcuts();
        this.window.webContents.send("clipboard-changed", this.stack);
    }

    setShorcuts() {
        globalShortcut.unregisterAll();
        for (let i = 0; i < 9 && i < this.stack.length; ++i) {
            let item = this.stack[i];
            let index = i;
            globalShortcut.register(`Ctrl+${i + 1}`, _ => {
                this.setClipboardItem(item);
                this.window.webContents.send("update-bullet", index);
            })
        }
    }

    setClipboardItem(item) {
        this.isSettingClipboard = true;
        clipboard.write(item);
    }

    initRendererListener() {

        ipcMain.on("set-clipboard", (evt, item) => {
            this.setClipboardItem(item);
        });
        ipcMain.on("display-full-text-window", (evt, item) => {
            this.fullTextWindow.webContents.send("display-full-text", item);
            this.fullTextWindow.show();
            this.fullTextWindow.setAlwaysOnTop(this.window.isAlwaysOnTop());

            let position = this.window.getPosition();
            this.fullTextWindow.setPosition(position[0], position[1]);
        });
    }

    clearClipboard() {

        this.stack = [];
        clipboard.clear();
        this.window.webContents.send("clipboard-changed", this.stack);
    }

    minimizeToTray(evt) {

        if (!this.isClosing) {
            evt.preventDefault();
            this.window.hide();
        }
    }

    toggleAlwaysOnTop() {

        this.window.setAlwaysOnTop(!this.window.isAlwaysOnTop())
    }

    closeApp() {

        this.isClosing = true;
        this.app.exit();
    }
}
module.exports = ClipboardApp;