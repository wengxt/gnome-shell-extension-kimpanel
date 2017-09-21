const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Meta = imports.gi.Meta;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const KimIndicator = Me.imports.indicator.KimIndicator;
const InputPanel = Me.imports.panel.InputPanel;
const KimMenu = Me.imports.menu.KimMenu;
const Lib = Me.imports.lib;
const convenience = Me.imports.convenience;

let kimpanel = null;

const KimpanelIface = '<node> \
<interface name="org.kde.impanel"> \
<signal name="MovePreeditCaret"> \
    <arg type="i" name="position" /> \
</signal> \
<signal name="SelectCandidate"> \
    <arg type="i" name="index" /> \
</signal> \
<signal name="LookupTablePageUp"> </signal> \
<signal name="LookupTablePageDown"> </signal> \
<signal name="TriggerProperty"> \
    <arg type="s" name="key" /> \
</signal> \
<signal name="PanelCreated"> </signal> \
<signal name="Exit"> </signal> \
<signal name="ReloadConfig"> </signal> \
<signal name="Configure"> </signal> \
</interface> \
</node>';

const Kimpanel2Iface = '<node> \
<interface name="org.kde.impanel2"> \
<signal name="PanelCreated2"> </signal> \
<method name="SetSpotRect"> \
    <arg type="i" name="x" direction="in" /> \
    <arg type="i" name="y" direction="in" /> \
    <arg type="i" name="w" direction="in" /> \
    <arg type="i" name="h" direction="in" /> \
</method> \
<method name="SetRelativeSpotRect"> \
    <arg type="i" name="x" direction="in" /> \
    <arg type="i" name="y" direction="in" /> \
    <arg type="i" name="w" direction="in" /> \
    <arg type="i" name="h" direction="in" /> \
</method> \
<method name="SetLookupTable"> \
    <arg direction="in" type="as" name="label"/> \
    <arg direction="in" type="as" name="text"/> \
    <arg direction="in" type="as" name="attr"/> \
    <arg direction="in" type="b" name="hasPrev"/> \
    <arg direction="in" type="b" name="hasNext"/> \
    <arg direction="in" type="i" name="cursor"/> \
    <arg direction="in" type="i" name="layout"/> \
</method> \
</interface> \
</node>';

const HelperIface = '<node> \
<interface name="org.fcitx.GnomeHelper"> \
<method name="LockXkbGroup"> \
    <arg direction="in" type="i" name="idx"/> \
</method> \
</interface> \
</node>';

const Kimpanel = new Lang.Class({
    Name: "Kimpanel",

    _init: function(params)
    {
        this.conn = Gio.bus_get_sync( Gio.BusType.SESSION, null );
        this.settings = convenience.getSettings();
        this._impl = Gio.DBusExportedObject.wrapJSObject(KimpanelIface, this);
        this._impl.export(Gio.DBus.session, '/org/kde/impanel');
        this._impl2 = Gio.DBusExportedObject.wrapJSObject(Kimpanel2Iface, this);
        this._impl2.export(Gio.DBus.session, '/org/kde/impanel');
        this._helperImpl = Gio.DBusExportedObject.wrapJSObject(HelperIface, this);
        this._helperImpl.export(Gio.DBus.session, '/org/fcitx/GnomeHelper');
        this.current_service = '';
        this.watch_id = 0;
        this.resetData();
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
                if (obj.current_service != sender) {
                    obj.current_service = sender;
                    if (obj.watch_id != 0) {
                        Gio.bus_unwatch_name(obj.watch_id);
                    }
                    obj.watch_id = Gio.bus_watch_name(Gio.BusType.SESSION,
                                                       obj.current_service,
                                                       Gio.BusNameWatcherFlags.NONE,
                                                       null,
                                                       Lang.bind(obj, obj.imExit));
                }
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
        this.owner_id = Gio.bus_own_name(Gio.BusType.SESSION,
                                         "org.kde.impanel",
                                         Gio.BusNameOwnerFlags.NONE,
                                         null,
                                         Lang.bind(this, this.requestNameFinished),
                                         null);
        this.helper_owner_id = Gio.bus_own_name(Gio.BusType.SESSION,
                                                "org.fcitx.GnomeHelper",
                                                Gio.BusNameOwnerFlags.NONE,
                                                null,
                                                null,
                                                null);
    },

    resetData: function() {
        this.preedit = '';
        this.aux = '';
        this.layoutHint = 0;
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
        this.relative = false;
        this.table = [];
        this.label = [];
        this.pos = 0;
        this.cursor = -1;
        this.showPreedit = false;
        this.showLookupTable = false;
        this.showAux = false;
        this.enabled = false;
    },

    imExit: function(conn, name) {
        if (this.current_service == name) {
            this.current_service = '';
            if (this.watch_id != 0) {
                Gio.bus_unwatch_name(this.watch_id);
                this.watch_id = 0;
            }

            this.resetData();
            this.indicator._updateProperties({});
            this.updateInputPanel();
        }
    },

    requestNameFinished: function() {
        this._impl.emit_signal('PanelCreated', null);
        this._impl2.emit_signal('PanelCreated2', null);
    },

    isLookupTableVertical: function() {
        return this.layoutHint == 0 ? Lib.isLookupTableVertical(this.settings) : (this.layoutHint == 1);
    },

    getTextStyle: function() {
        return Lib.getTextStyle(this.settings);
    },

    destroy: function ()
    {
        if (this.watch_id != 0) {
            Gio.bus_unwatch_name(this.watch_id);
            this.watch_id = 0;
            this.current_service = '';
        }
        this.settings.disconnect(this.verticalSignal);
        this.settings.disconnect(this.fontSignal);
        this.conn.signal_unsubscribe(this.dbusSignal);
        Gio.bus_unown_name(this.owner_id);
        Gio.bus_unown_name(this.helper_owner_id);
        this._impl.unexport();
        this._impl2.unexport();
        this._helperImpl.unexport();
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
    triggerProperty: function(arg)
    {
        this._impl.emit_signal('TriggerProperty', GLib.Variant.new('(s)',[arg]));
    },
    selectCandidate: function(arg)
    {
        this._impl.emit_signal('SelectCandidate', GLib.Variant.new('(i)',[arg]));
    },
    setRect: function(x, y, w, h, relative)
    {
        let changed = false;
        if (this.x != x || this.y != y || this.w != w || this.h != h || this.relative != relative)
            changed = true;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.relative = relative;
        if (changed)
            this.updateInputPanel();
    },
    SetSpotRect: function(x, y, w, h)
    {
        this.setRect(x, y, w, h, false);
    },
    SetRelativeSpotRect: function(x, y, w, h)
    {
        this.setRect(x, y, w, h, true);
    },
    SetLookupTable: function(labels, texts, attrs, hasPrev, hasNext, cursor, layout)
    {
        this.label = labels;
        this.table = texts;
        this.cursor = cursor;
        this.layoutHint = layout;
        this.updateInputPanel();
        this.inputpanel.setVertical(this.isLookupTableVertical());
    },
    LockXkbGroup: function(idx)
    {
        Meta.get_backend().lock_layout_group(idx);
    },
});

function init() {
    convenience.initTranslations();
}

function enable()
{
    if (!kimpanel) {
        kimpanel = new Kimpanel();
    }
}

function disable()
{
    kimpanel.destroy();
    kimpanel = null;
}
// vim: set ts=4 sw=4 sts=4 expandtab
