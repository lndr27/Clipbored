const { app, ipcMain, globalShortcut, Menu, Tray, BrowserWindow } = require("electron");
const Clipboard = require("./Clipboard");
const __rootpath = `${__dirname}/..`;
const system = require("@paulcbetts/system-idle-time");

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

        this.minIdleTime = 5000;
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
            clearInterval(this._idleIntervalID);
            this.window = null;
            this.fullTextWindow = null;
        });
        this._idleIntervalID = setInterval(_ => {
            if (system.getIdleTime() > this.minIdleTime) {
                this.clipboard.stopPolling();
            }
            else {
                this.clipboard.startPolling();
            }
        }, 1000);
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

        this.window = new BrowserWindow({ width: 240, minWidth: 240, maxWidth: 1500, minHeight: 500, icon: this.icon });
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
                { label: "DevTools", click: this._toggleDevTools.bind(this) },
                { label: "Exit", click: this._closeApp.bind(this) }
            ]
        }]));
    }

    _initFullTextWindow() {

        this.fullTextWindow = new BrowserWindow({ width: 300, maxWidth: 1000, height: 300, icon: this.icon });
        //this.fullTextWindow.openDevTools();
        this.fullTextWindow.loadURL(this.fullTextWindowView);
        this.fullTextWindow.setMenu(null);
        this.fullTextWindow.hide();
        this.fullTextWindow.on("close", evt => {
            evt.preventDefault();
            this.fullTextWindow.hide();
            this.clipboard.startPolling();
        });
    }

    _clipboardChanged(entry) {        
        this._addHistoryEntry(entry);
        this._registerShorcuts();
        this.window.webContents.send("refresh-history", this.stack);
    }

    _addHistoryEntry(entry) {

        if (this.stack.length == 0) {
            this.stack.push(entry);
            return;
        }

        this.stack.push({});
        let currItem = entry;
        for (let i = 0; i < this.stack.length; ++i) {
            let item = this.stack[i];
            if (item.isPinned) {
                continue;
            }
            else {
                let aux = this.stack[i];
                this.stack[i] = currItem;
                currItem = aux;
            }
        }

        if (this.stack.length > this.maxHistoryEntries && !this.stack[this.stack.length - 1].isPinned) {
            this.stack.splice(this.stack.length - 1, 0);
        }
    }

    _registerShorcuts() {

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
        ipcMain.on("display-full-text-window", (evt, index) => this._displayEntryOnFullTextWindow(index));
        ipcMain.on("window-move", (evt) => this.clipboard.stopPolling());
        ipcMain.on("window-moved", (evt) => this.clipboard.startPolling());
        ipcMain.on("pin-entry", (evt, index) => { this.stack[index].isPinned = !this.stack[index].isPinned; });
    }

    _displayEntryOnFullTextWindow(entryIndex) {
        let entry = this.stack[entryIndex];
        this.fullTextWindow.webContents.send("display-full-text", entry);
        this.fullTextWindow.show();
        this.fullTextWindow.setAlwaysOnTop(this.window.isAlwaysOnTop());
        this.clipboard.stopPolling();

        let position = this.window.getPosition();
        this.fullTextWindow.setPosition(position[0], position[1]);
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

    _toggleDevTools() {

        this.window.isDevToolsOpened() ? this.window.closeDevTools() : this.window.openDevTools();
    }

    _closeApp() {

        this.isClosing = true;
        this.app.exit();
    }

}
module.exports = ClipboardApp;