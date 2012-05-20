const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const KimIndicator = Me.imports.indicator.KimIndicator;
const InputPanel = Me.imports.panel.InputPanel;
const KimMenu = Me.imports.menu.KimMenu;
const Lib = Me.imports.lib;
const convenience = Me.imports.convenience;

let kimpanel = null;

const KimpanelIface = <interface name="org.kde.impanel">
<signal name="MovePreeditCaret">
    <arg type="i" name="position" />
</signal>
<signal name="SelectCandidate">
    <arg type="i" name="index" />
</signal>
<signal name="LookupTablePageUp"> </signal>
<signal name="LookupTablePageDown"> </signal>
<signal name="TriggerProperty">
    <arg type="s" name="key" />
</signal>
<signal name="PanelCreated"> </signal>
<signal name="Exit"> </signal>
<signal name="ReloadConfig"> </signal>
<signal name="Configure"> </signal>
</interface>

const Kimpanel = new Lang.Class({
    Name: "Kimpanel",

    _init: function(params)
    {
        this.conn = Gio.bus_get_sync( Gio.BusType.SESSION, null );
        this.owner_id = Gio.bus_own_name(Gio.BusType.SESSION,
                                         "org.kde.impanel",
                                         Gio.BusNameOwnerFlags.NONE,
                                         null,
                                         null,
                                         null);
        this._impl = Gio.DBusExportedObject.wrapJSObject(KimpanelIface, this);
        this._impl.export(Gio.DBus.session, '/org/kde/impanel');
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
        this.indicator = new KimIndicator({kimpanel: this});
        this.inputpanel = new InputPanel({kimpanel: this});
        this.menu = new KimMenu({sourceActor: this.indicator.actor, kimpanel: this});
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
                obj.indicator._updateProperties(value[0]);
                break;
            case 'UpdateProperty':
                obj.indicator._updateProperty(value[0]);
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
        Gio.bus_unown_name(this.owner_id);
        this._impl.unexport();
        this.indicator.destroy();
        this.indicator = null;
        this.inputpanel = null;
    },

    addToShell: function ()
    {
        Main.uiGroup.add_actor(this.menu.actor);
        this.menu.actor.hide();
        Main.uiGroup.add_actor(this.inputpanel.actor);
        Main.uiGroup.add_actor(this.inputpanel._cursor);
        Main.panel.addToStatusArea('kimpanel', this.indicator);
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
            this.indicator._active();
        else
            this.indicator._deactive();
    },

    emit: function(signal)
    {
        this._impl.emit_signal(signal, null);

    },
    triggerProperty: function(arg)
    {
        this._impl.emit_signal('TriggerProperty', GLib.Variant.new('(s)',[arg]));
    }
});

function init() {
    convenience.initTranslations();
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
