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

const Kimpanel2Iface = <interface name="org.kde.impanel2">
<signal name="PanelCreated2"> </signal>
<method name="SetSpotRect">
    <arg type="i" name="x" direction="in" />
    <arg type="i" name="y" direction="in" />
    <arg type="i" name="w" direction="in" />
    <arg type="i" name="h" direction="in" />
</method>
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
        this.settings = convenience.getSettings();
        this._impl = Gio.DBusExportedObject.wrapJSObject(KimpanelIface, this);
        this._impl.export(Gio.DBus.session, '/org/kde/impanel');
        this._impl2 = Gio.DBusExportedObject.wrapJSObject(Kimpanel2Iface, this);
        this._impl2.export(Gio.DBus.session, '/org/kde/impanel');
        this.preedit = '';
        this.aux = '';
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
        this.table = [];
        this.label = [];
        this.pos = 0;
        this.cursor = -1;
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
            let changed = false;
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
                if(obj.enabled)
                    obj.indicator._active();
                else
                    obj.indicator._deactive();
                break;
            case 'UpdateSpotLocation':
                if (obj.x != value[0] || obj.y != value[1] || obj.w != 0 || obj.h != 0)
                    changed = true;
                obj.x = value[0];
                obj.y = value[1];
                obj.w = 0;
                obj.h = 0;
                break;
            case 'UpdatePreeditText':
                if (obj.preedit != value[0])
                    changed = true;
                obj.preedit = value[0];
                break;
            case 'UpdateAux':
                if (obj.aux != value[0])
                    changed = true;
                obj.aux = value[0];
                break;
            case 'UpdateLookupTable':
                changed = true;
                obj.label = value[0];
                obj.table = value[1];
                break;
            case 'UpdateLookupTableCursor':
                if (obj.pos != value[0])
                    changed = true;
                obj.cursor = value[0];
                break;
            case 'UpdatePreeditCaret':
                if (obj.pos != value[0])
                    changed = true;
                obj.pos = value[0];
                break;
            case 'ShowPreedit':
                if (obj.showPreedit != value[0])
                    changed = true;
                obj.showPreedit = value[0];
                break;
            case 'ShowLookupTable':
                if (obj.showLookupTable != value[0])
                    changed = true;
                obj.showLookupTable = value[0];
                break;
            case 'ShowAux':
                if (obj.showAux != value[0])
                    changed = true;
                obj.showAux = value[0];
                break;
            case 'Enable':
                obj.enabled = value[0];
                if(obj.enabled)
                    obj.indicator._active();
                else
                    obj.indicator._deactive();
                break;
            }
            if (changed)
                obj.updateInputPanel();
        }

        this.verticalSignal = this.settings.connect('changed::vertical', Lang.bind(this, function(){
            this.inputpanel.setVertical(this.isLookupTableVertical());
        }));

        this.fontSignal = this.settings.connect('changed::font', Lang.bind(this, function(){
            this.inputpanel.updateFont(this.getTextStyle());
        }));

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

    isLookupTableVertical: function() {
        return Lib.isLookupTableVertical(this.settings);
    },

    getTextStyle: function() {
        return Lib.getTextStyle(this.settings);
    },

    destroy: function ()
    {
        this.settings.disconnect(this.verticalSignal);
        this.settings.disconnect(this.fontSignal);
        this.conn.signal_unsubscribe(this.dbusSignal);
        Gio.bus_unown_name(this.owner_id);
        this._impl.unexport();
        this._impl2.unexport();
        this.indicator.destroy();
        this.indicator = null;
        this.inputpanel = null;
    },

    addToShell: function ()
    {
        Main.uiGroup.add_actor(this.menu.actor);
        this.menu.actor.hide();
        Main.layoutManager.addChrome(this.inputpanel.actor, {});
        Main.uiGroup.add_actor(this.inputpanel._cursor);
        Main.panel.addToStatusArea('kimpanel', this.indicator);
    },

    updateInputPanel: function()
    {
        let inputpanel = this.inputpanel;

        this.showAux ? inputpanel.setAuxText(this.aux) : inputpanel.hideAux();
        this.showPreedit ? inputpanel.setPreeditText(this.preedit, this.pos) : inputpanel.hidePreedit();

        let text = '';
        this.inputpanel.setLookupTable(this.label, this.table, this.showLookupTable);
        this.inputpanel.setLookupTableCursor(this.cursor);
        this.inputpanel.updatePosition();
    },
    emit: function(signal)
    {
        this._impl.emit_signal(signal, null);
    },
    emit2: function(signal)
    {
        this._impl2.emit_signal(signal, null);
    },
    triggerProperty: function(arg)
    {
        this._impl.emit_signal('TriggerProperty', GLib.Variant.new('(s)',[arg]));
    },
    selectCandidate: function(arg)
    {
        this._impl.emit_signal('SelectCandidate', GLib.Variant.new('(i)',[arg]));
    },
    SetSpotRect: function(x, y, w, h)
    {
        let changed = false;
        if (this.x != x || this.y != y || this.w != w || this.h != h)
            changed = true;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        if (changed)
            this.updateInputPanel();
    }
});

function init() {
    convenience.initTranslations();
}

function enable()
{
    if (!kimpanel) {
        kimpanel = new Kimpanel();
        kimpanel.emit('PanelCreated');
        kimpanel.emit2('PanelCreated2');
    }
}

function disable()
{
    kimpanel.destroy();
    kimpanel = null;
}
// vim: set ts=4 sw=4 sts=4 expandtab
