const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;
const Main = imports.ui.main;

const Lang = imports.lang;

inputPanel.prototype = {
    _init: function(kimpanel) {
        this.panel = new St.Label({ style_class: 'kimpanel-label', text: '' , visible: false});
        this.actor = this.panel;
        this.kimpanel = kimpanel;
    },
    setText: function(text) {
        this.panel.text = text;
    },
    updatePosition: function() {
        let kimpanel = this.kimpanel;
        let monitor = Main.layoutManager.focusMonitor;
        let x = this.kimpanel.x;
        let y = this.kimpanel.y;
        if (x + this.width > monitor.width)
            x = monitor.width - this.width;
        if (y + this.height > monitor.height)
            y = y - this.height - 20;
        if (x < 0)
            x = 0;
        if (y < 0)
            y = 0;
        this.panel.set_position(x, y);
        this.panel.visible = kimpanel.showAux || kimpanel.showPreedit || kimpanel.showLookupTable;
    },

}

function inputPanel(kimpanel) {
    this._init.apply(this, arguments);
}
