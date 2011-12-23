const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;

const DBus = imports.gi.Gio.DBusConnection;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const Lang = imports.lang;

let kimpanel = null;
let inputpanel = null;
let kimicon = null;

Kimpanel.prototype = {
    _init: function() 
    {
        this.conn = Gio.bus_get_sync( Gio.BusType.SESSION, null );
        this.preedit = '';
        this.aux = '';
        this.im = '';
        this.x = 0;
        this.y = 0;
        this.table = [];
        this.label = [];
        this.pos = 0;
        this.showPreedit = false;
        this.showLookupTable = false;
        this.showAux = false;
        this.enabled = false;
    }
}

function Kimpanel() {
    this._init.apply(this, arguments);
}

function _parseSignal(conn, sender, object, iface, signal, param, user_data)
{
    value = param.deep_unpack();
    switch(signal)
    {
    case 'UpdateSpotLocation':
        kimpanel.x = value[0];
        kimpanel.y = value[1];
        break;
    case 'UpdatePreeditText':
        kimpanel.preedit = value[0];
        break;
    case 'UpdateAux':
        kimpanel.aux = value[0];
        break;
    case 'UpdateProperty':
        if (value[0].match(/\/im/) )
        {
            kimpanel.im = value[0].split(":")[1];
            break;
        }
        else
            break;
    case 'UpdateLookupTable':
        kimpanel.label = value[0];    
        kimpanel.table = value[1];    
        break;
    case 'UpdatePreeditCaret':
        kimpanel.pos = value[0];
        break;
    case 'ShowPreedit':
        kimpanel.showPreedit = value[0];
        break;
    case 'ShowLookupTable':
        kimpanel.showLookupTable = value[0];
        break;
    case 'ShowAux':
        kimpanel.showAux = value[0];
        break;
    case 'Enable':
        kimpanel.enabled = value[0];
        break;
    }
    _updateInputPanel();
}

KimIcon.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function(){
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'input-keyboard');
        
        this._menuSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._menuSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addSettingsAction("Settings", 'fcitx-configtool.desktop');
    },
    _clearActor: function() {
        if (this._iconActor != null) {
            this.actor.remove_actor(this._iconActor);
            this._iconActor.destroy();
            this._iconActor = null;
            this._iconName = null;
        }
        if (this._labelActor) {
            this.actor.remove_actor(this._labelActor);
            this._labelActor.destroy();
            this._labelActor = null;
            this._label = null;
        }
    },
    _setIcon: function(iconName,className) {
        this._clearActor();
        this._iconName = iconName;
        this._iconActor = new St.Icon({ icon_name: iconName,
                                        icon_type: St.IconType.SYMBOLIC,
                                        style_class: 'system-status-icon' });
        if(className!=null)
            this._iconActor.style_class+=' '+className;
        this.actor.add_actor(this._iconActor);
        this.actor.queue_redraw();
    },
    _active: function(){
        this._setIcon('input-keyboard',null);
    },

    _deactive: function(){
        this._setIcon('input-keyboard','icon-disable');
    }
}

function KimIcon() {
    this._init.apply(this, arguments);
}

function _updateInputPanel() {
    text = '';
    if (kimpanel.showAux)
        text = text + kimpanel.aux;
        if (text!="")
            text = text +'\t' + kimpanel.im;
    if (kimpanel.showPreedit)
        text = text + kimpanel.preedit;
    if (kimpanel.showLookupTable)
    {
        text = text + "\n";
        i = 0;
        len = ( kimpanel.label.length > kimpanel.table.length ) ? kimpanel.table.length : kimpanel.label.length;
        for(i = 0; i < len ; i ++)
        {
            text = text + kimpanel.label[i] + kimpanel.table[i];
        }
    }
    inputpanel.text = text;
    let monitor = Main.layoutManager.focusMonitor;
    let x = kimpanel.x;
    let y = kimpanel.y;
    if (x + inputpanel.width > monitor.width)
        x = monitor.width - inputpanel.width;
    if (y + inputpanel.height > monitor.height)
        y = y - inputpanel.height - 20;
    if (x < 0)
        x = 0;
    if (y < 0)
        y = 0;
    inputpanel.set_position(x, y);
    inputpanel.visible = kimpanel.showAux || kimpanel.showPreedit || kimpanel.showLookupTable;
    if(kimpanel.enabled)
    {
        kimicon._active();    
    }else{
        kimicon._deactive();
    }
}

function init() {
}

function enable()
{
    if(!kimicon){
        kimicon=new KimIcon();
        Main.panel.addToStatusArea('kimpanel', kimicon);
    }

    if (!kimpanel) {
        kimpanel = new Kimpanel();
        signal = kimpanel.conn.signal_subscribe(
            null,
            "org.kde.kimpanel.inputmethod",
            null,
            null,
            null,
            Gio.DBusSignalFlags.NONE,
            _parseSignal,
            null,
            null
        );
    }

    if (!inputpanel)
    {
        inputpanel = new St.Label({ style_class: 'kimpanel-label', text: '' , visible: false});
        let monitor = Main.layoutManager.focusMonitor;
        Main.uiGroup.add_actor(inputpanel);
    }
}

function disable()
{
    kimpanel = null;
    kimicon.destroy();
    inputpanel = null;
}
// vim: set ts=4 sw=4 sts=4 expandtab
