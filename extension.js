const Main = imports.ui.main;

const DBus = imports.dbus;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const KimIcon = Me.imports.indicator.KimIcon;
const InputPanel = Me.imports.panel.InputPanel;
const KimMenu = Me.imports.menu.KimMenu;
const Lib = Me.imports.lib;

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

const Kimpanel = new Lang.Class({
    Name: "Kimpanel",

    _init: function(params)
    {
        DBus.session.proxifyObject(this, 'org.kde.impanel', '/org/kde/impanel');
        DBus.session.exportObject('/org/kde/impanel',this);
        this.owner_id = DBus.session.acquire_name('org.kde.impanel',DBus.SINGLE_INSTANCE,null,null);
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
        this.kimicon = new KimIcon({kimpanel: this});
        this.inputpanel = new InputPanel({kimpanel: this});
        this.menu = new KimMenu({sourceActor: this.kimicon.actor, kimpanel: this});
        var obj = this;

        function _parseSignal(conn, sender, object, iface, signal, param, user_data)
        {
            let value = param.deep_unpack();
            switch(signal)
            {
            case 'ExecMenu':
                obj.menu.execMenu(value[0]);
                break
            case 'RegisterProperties':
                obj.kimicon._updateProperties(value[0]);
                break;
            case 'UpdateProperty':
                obj.kimicon._updateProperty(value[0]);
                break;
            case 'UpdateSpotLocation':
                obj.x = value[0];
                obj.y = value[1];
                break;
            case 'UpdatePreeditText':
                obj.preedit = value[0];
                break;
            case 'UpdateAux':
                obj.aux = value[0];
                break;
            case 'UpdateLookupTable':
                obj.label = value[0];
                obj.table = value[1];
                break;
            case 'UpdatePreeditCaret':
                obj.pos = value[0];
                break;
            case 'ShowPreedit':
                obj.showPreedit = value[0];
                break;
            case 'ShowLookupTable':
                obj.showLookupTable = value[0];
                break;
            case 'ShowAux':
                obj.showAux = value[0];
                break;
            case 'Enable':
                obj.enabled = value[0];
                break;
            }
            obj.updateInputPanel();
        }

        this.addToShell();
        this.dbusSignal = this.conn.signal_subscribe(
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
    },

    destroy: function ()
    {
        this.conn.signal_unsubscribe(this.dbusSignal);
        this.kimicon.destroy();
        this.kimicon = null;
        DBus.session.release_name_by_id(this.owner_id);
        DBus.session.unexportObject(this);
        this.inputpanel = null;
    },

    addToShell: function ()
    {
        Main.uiGroup.add_actor(this.menu.actor);
        this.menu.actor.hide();
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
            let i = 0;
            let len = ( this.label.length > this.table.length ) ? this.table.length : this.label.length;
            for(i = 0; i < len ; i ++)
            {
                text = text + this.label[i] + this.table[i];
            }
        }
        this.inputpanel.setLookupTable(text);
        this.inputpanel.updatePosition();

        if(this.enabled)
            this.kimicon._active();
        else
            this.kimicon._deactive();
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
});

function init() {
    Lib.initTranslations(Me);
    DBus.proxifyPrototype( Kimpanel.prototype, KimpanelIFace );
    DBus.conformExport(Kimpanel.prototype, KimpanelIFace );
}

function enable()
{
    if (!kimpanel) {
        kimpanel = new Kimpanel();
        kimpanel.emit('PanelCreated',[]);
    }
}

function disable()
{
    kimpanel.destroy();
    kimpanel = null;
}
// vim: set ts=4 sw=4 sts=4 expandtab
