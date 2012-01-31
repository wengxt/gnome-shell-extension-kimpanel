const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

const Main = imports.ui.main;

const DBus = imports.dbus;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const Me = imports.ui.extensionSystem.extensions['kimpanel@kde.org'];
const KimIcon = Me.indicator.kimIcon;
const InputPanel = Me.panel.inputPanel;

let kimpanel = null;

const KimpanelIFace = {
    name: 'org.kde.impanel',
    methods:[],
    signals:[
        { name: "SelectCandidate", inSignature:'i' },
        { name: "MovePreeditCaret", inSignature:'i' },
        { name: "LookupTablePageUp" },
        { name: "LookupTablePageDown" },
        { name: "TriggerProperty", inSignature:'s' },
        { name: "PanelCreated"},
        { name: "Exit" },
        { name: "ReloadConfig" },
        { name: "Configure" }
    ],
    properties:[]
};

function Kimpanel() {
    this._init.apply(this, arguments);
}

Kimpanel.prototype = {
    _init: function() 
    {
        DBus.session.proxifyObject(this, 'org.kde.impanel', '/org/kde/impanel');
        DBus.session.exportObject('/org/kde/impanel',this);
        DBus.session.acquire_name('org.kde.impanel',DBus.SINGLE_INSTANCE,null,null);
        this.conn = Gio.bus_get_sync( Gio.BusType.SESSION, null );
        this.preedit = '';
        this.aux = '';
        this.x = 0;
        this.y = 0;
        this.table = [];
        this.label = [];
        this.pos = 0;
        this.showPreedit = false;
        this.showLookupTable = false;
        this.showAux = false;
        this.enabled = false;
        this.kimicon = new KimIcon(this);
        this.inputpanel = new InputPanel(this);
    },

    destroy: function ()
    {
        this.kimicon.destroy();
        DBus.session.unexportObject(this);
        this.inputpanel = null;
    },

    addToShell: function ()
    {
        Main.uiGroup.add_actor(this.inputpanel.actor);
        Main.uiGroup.add_actor(this.inputpanel._cursor);
        Main.panel.addToStatusArea('kimpanel', this.kimicon);
    },

    updateInputPanel: function()
    {
        let inputpanel = this.inputpanel;
        
        this.showAux ? inputpanel.setAuxText(this.aux) : inputpanel.hideAux();
        this.showPreedit ? inputpanel.setPreeditText(this.preedit) : inputpanel.hidePreedit();

        let text = '';
        if (this.showLookupTable)
        {
            i = 0;
            let len = ( this.label.length > this.table.length ) ? this.table.length : this.label.length;
            for(i = 0; i < len ; i ++)
            {
                text = text + this.label[i] + this.table[i];
            }
        }
        this.inputpanel.setLookupTable(text);
        this.inputpanel.updatePosition();
        
        if(this.enabled)
        {
            this.kimicon._active();    
        }else{
            this.kimicon._deactive();
        }
    },

    emit: function(signal)
    {
        DBus.session.emit_signal('/org/kde/impanel',
                                 'org.kde.impanel',
                                 signal, 
                                  '',[]
                                );
    
    },
    triggerProperty: function(arg)
    {
        DBus.session.emit_signal('/org/kde/impanel',
            'org.kde.impanel',
            'TriggerProperty', 
            's',[arg]
        );
    }
}


function _parseSignal(conn, sender, object, iface, signal, param, user_data)
{
    value = param.deep_unpack();
    switch(signal)
    {
    case 'RegisterProperties':
        let  properties = value[0];
        for( p in properties)
            kimpanel.kimicon._parseProperty(properties[p]);
        kimpanel.kimicon._updateProperties();
        break;
    case 'UpdateProperty':
        kimpanel.kimicon._parseProperty(value[0]);
        kimpanel.kimicon._updateProperties();
        break;
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
    kimpanel.updateInputPanel();
}

function init() {
    DBus.proxifyPrototype( Kimpanel.prototype, KimpanelIFace );
    DBus.conformExport(Kimpanel.prototype, KimpanelIFace );
}

function enable()
{
    if (!kimpanel) {
        kimpanel = new Kimpanel();
        kimpanel.addToShell();
        var signal = kimpanel.conn.signal_subscribe(
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
        kimpanel.emit('PanelCreated',[]);
    }
}

function disable()
{
    kimpanel.destroy();
}
// vim: set ts=4 sw=4 sts=4 expandtab
