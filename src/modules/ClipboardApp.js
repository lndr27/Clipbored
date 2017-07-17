const { app, ipcMain, globalShortcut, Menu, Tray, BrowserWindow } = require("electron");
const Clipboard = require("./Clipboard");
const __rootpath = `${__dirname}/..`;

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

        this.latestHtmlEntry = null;

        this.isSettingClipboard = false;

        this.clipboard = null;

        this.shorcutCombo = "Ctrl+";

        this.icon = `${__rootpath}/resources/img/clipboard.ico`;

        this.mainWindowView = `${__rootpath}/views/index.html`;

        this.fullTextWindowView= `${__rootpath}/views/fullText.html`;

        this.maxHistoryEntries = 20;
    }

    init() {

        this.clipboard = new Clipboard();

        this.app.on("ready", _ => {
            this._initUI();         
            this.clipboard.onChange(this._clipboardChanged.bind(this));
            this._initRendererListener();
            globalShortcut.unregisterAll();
        });
        this.app.on("will-quit", _ => {

        });            
    }

    _initUI() {
        this._initTray();
        this._initWindow();
        this._initFullTextWindow();
    }

    _initTray() {

        this.tray = new Tray(this.icon);
        this.tray.on("double-click", evt => this.window.show());
        this.tray.setContextMenu(Menu.buildFromTemplate([{ label: "Exit", click: this._closeApp.bind(this) }]));
    }

    _initWindow() {

        this.window = new BrowserWindow({ width: 240, minWidth: 240, maxWidth: 500, minHeight: 500, icon: this.icon });
        //this.window.openDevTools();
        this.window.setAlwaysOnTop(true);
        this.window.loadURL(this.mainWindowView);
        this.window.on("minimize", this._minimizeToTray.bind(this));
        this.window.on("close", this._minimizeToTray.bind(this));
        this.window.setMenu(Menu.buildFromTemplate([{
            label: "File",
            submenu: [
                { label: "Clear", click: this.clearClipboard.bind(this) },
                { label: "Always on top", click: this._toggleAlwaysOnTop.bind(this) },
                { type: "separator" },
                { label: "Exit", click: this._closeApp.bind(this) }
            ]
        }]));
    }

    _initFullTextWindow(item) {

        this.fullTextWindow = new BrowserWindow({ width: 300, maxWidth: 1000, height: 300, icon: this.icon });
        //this.fullTextWindow.openDevTools();
        this.fullTextWindow.loadURL(this.fullTextWindowView);
        this.fullTextWindow.setMenu(null);
        this.fullTextWindow.hide();
        this.fullTextWindow.on("close", evt => {
            evt.preventDefault();
            this.fullTextWindow.hide();
        });
    }

    _clipboardChanged(entry) {        
        this._addHistoryEntry(entry);
        this._setShorcuts();
        this.window.webContents.send("refresh-history", this.stack);
    }

    _addHistoryEntry(entry) {
        this.stack = [entry].concat(this.stack.length > this.maxHistoryEntries ? this.stack.slice(0, this.stack.length - 1) : this.stack);
    }

    _setShorcuts() {

        globalShortcut.unregisterAll();
        for (let i = 0; i < 9 && i < this.stack.length; ++i) {
            let shortcut = `${this.shorcutCombo}${i + 1}`
            globalShortcut.register(shortcut, _ => {
                this.clipboard.write(this.stack[i]);
                this.window.webContents.send("update-active-content", i);
            })
        }
    }

    _initRendererListener() {

        ipcMain.on("set-clipboard", (evt, index) => this.clipboard.write(this.stack[index]));

        ipcMain.on("display-full-text-window", (evt, index) => {
            this.fullTextWindow.webContents.send("display-full-text", this.stack[index]);
            this.fullTextWindow.show();
            this.fullTextWindow.setAlwaysOnTop(this.window.isAlwaysOnTop());

            let position = this.window.getPosition();
            this.fullTextWindow.setPosition(position[0], position[1]);
        });
    }

    clearClipboard() {

        this.stack = [];
        this.clipboard.clear();
        this.window.webContents.send("refresh-history", this.stack);
    }

    _minimizeToTray(evt) {

        if (!this.isClosing) {
            evt.preventDefault();
            this.window.hide();
        }
    }

    _toggleAlwaysOnTop() {

        this.window.setAlwaysOnTop(!this.window.isAlwaysOnTop())
    }

    _closeApp() {

        this.isClosing = true;
        this.app.exit();
    }
}
module.exports = ClipboardApp;