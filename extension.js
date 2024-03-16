import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {InputPanel} from './panel.js';
import {KimIndicator} from './indicator.js';
import {KimMenu} from './menu.js';
import * as Lib from './lib.js';

var kimpanel = null;

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
<method name="SetRelativeSpotRectV2"> \
    <arg type="i" name="x" direction="in" /> \
    <arg type="i" name="y" direction="in" /> \
    <arg type="i" name="w" direction="in" /> \
    <arg type="i" name="h" direction="in" /> \
    <arg type="d" name="scale" direction="in" /> \
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

class Kimpanel extends GObject.Object {
    static {
        GObject.registerClass(this);
    }

    _init(settings) {
        this._isDestroyed = false;
        this.resetData();
        this.conn = Gio.bus_get_sync(Gio.BusType.SESSION, null);
        this.settings = settings;
        this._impl = Gio.DBusExportedObject.wrapJSObject(KimpanelIface, this);
        this._impl.export(Gio.DBus.session, '/org/kde/impanel');
        this._impl2 = Gio.DBusExportedObject.wrapJSObject(Kimpanel2Iface, this);
        this._impl2.export(Gio.DBus.session, '/org/kde/impanel');
        this._helperImpl =
            Gio.DBusExportedObject.wrapJSObject(HelperIface, this);
        this._helperImpl.export(Gio.DBus.session, '/org/fcitx/GnomeHelper');
        this.current_service = '';
        this.watch_id = 0;
        this.indicator = new KimIndicator({kimpanel : this});
        this.inputpanel = new InputPanel({kimpanel : this});
        this.menu =
            new KimMenu({sourceActor : this.indicator, kimpanel : this});

        this.verticalSignal = this.settings.connect(
            'changed::vertical',
            () => this.inputpanel.setVertical(this.isLookupTableVertical()));

        this.fontSignal = this.settings.connect(
            'changed::font',
            () => this.inputpanel.updateFont(this.getTextStyle()));

        this.addToShell();
        this.dbusSignal = this.conn.signal_subscribe(
            null, "org.kde.kimpanel.inputmethod", null, null, null,
            Gio.DBusSignalFlags.NONE, this._parseSignal.bind(this));
        this.owner_id = Gio.bus_own_name(
            Gio.BusType.SESSION, "org.kde.impanel", Gio.BusNameOwnerFlags.NONE,
            null, () => this.requestNameFinished(), null);
        this.helper_owner_id =
            Gio.bus_own_name(Gio.BusType.SESSION, "org.fcitx.GnomeHelper",
                             Gio.BusNameOwnerFlags.NONE, null, null, null);
    }

    _parseSignal(conn, sender, object, iface, signal, param) {
        if (this._isDestroyed) {
            return;
        }
        let value = param.deep_unpack();
        let changed = false;
        switch (signal) {
        case 'ExecMenu':
            this.menu.execMenu(value[0]);
            break;
        case 'RegisterProperties':
            if (this.current_service != sender) {
                this.current_service = sender;
                if (this.watch_id != 0) {
                    Gio.bus_unwatch_name(this.watch_id);
                }
                this.watch_id = Gio.bus_watch_name(
                    Gio.BusType.SESSION, this.current_service,
                    Gio.BusNameWatcherFlags.NONE, null, this.imExit.bind(this));
            }
            this.indicator._updateProperties(value[0]);
            break;
        case 'UpdateProperty':
            this.indicator._updateProperty(value[0]);
            if (this.enabled)
                this.indicator._active();
            else
                this.indicator._deactive();
            break;
        case 'UpdateSpotLocation':
            if (this.x != value[0] || this.y != value[1] || this.w != 0 ||
                this.h != 0)
                changed = true;
            this.x = value[0];
            this.y = value[1];
            this.w = 0;
            this.h = 0;
            break;
        case 'UpdatePreeditText':
            if (this.preedit != value[0])
                changed = true;
            this.preedit = value[0];
            break;
        case 'UpdateAux':
            if (this.aux != value[0])
                changed = true;
            this.aux = value[0];
            break;
        case 'UpdateLookupTable':
            changed = true;
            this.label = value[0];
            this.table = value[1];
            break;
        case 'UpdateLookupTableCursor':
            if (this.pos != value[0])
                changed = true;
            this.cursor = value[0];
            break;
        case 'UpdatePreeditCaret':
            if (this.pos != value[0])
                changed = true;
            this.pos = value[0];
            break;
        case 'ShowPreedit':
            if (this.showPreedit != value[0])
                changed = true;
            this.showPreedit = value[0];
            break;
        case 'ShowLookupTable':
            if (this.showLookupTable != value[0])
                changed = true;
            this.showLookupTable = value[0];
            break;
        case 'ShowAux':
            if (this.showAux != value[0])
                changed = true;
            this.showAux = value[0];
            break;
        case 'Enable':
            this.enabled = value[0];
            if (this.enabled)
                this.indicator._active();
            else
                this.indicator._deactive();
            break;
        }
        if (changed)
            this.updateInputPanel();
    }

    resetData() {
        this.preedit = '';
        this.aux = '';
        this.layoutHint = 0;
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
        this.relative = false;
        this.scale = 1;
        this.table = [];
        this.label = [];
        this.pos = 0;
        this.cursor = -1;
        this.showPreedit = false;
        this.showLookupTable = false;
        this.showAux = false;
        this.enabled = false;
    }

    imExit(conn, name) {
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
    }

    requestNameFinished() {
        if (this._isDestroyed) {
            return;
        }
        this._impl.emit_signal('PanelCreated', null);
        this._impl2.emit_signal('PanelCreated2', null);
    }

    isLookupTableVertical() {
        return this.layoutHint == 0 ? Lib.isLookupTableVertical(this.settings)
                                    : (this.layoutHint == 1);
    }

    getTextStyle() { return Lib.getTextStyle(this.settings); }

    destroy() {
        this._isDestroyed = true;
        this.resetData();
        this.updateInputPanel();
        if (this.watch_id != 0) {
            Gio.bus_unwatch_name(this.watch_id);
            this.watch_id = 0;
            this.current_service = '';
        }
        this.settings.disconnect(this.verticalSignal);
        this.settings.disconnect(this.fontSignal);
        this.settings = null;
        this.conn.signal_unsubscribe(this.dbusSignal);
        this.conn = null;
        Gio.bus_unown_name(this.owner_id);
        Gio.bus_unown_name(this.helper_owner_id);
        this._impl.unexport();
        this._impl = null;
        this._impl2.unexport();
        this._impl2 = null;
        this._helperImpl.unexport();
        this._helperImpl = null;
        // Menu need to be destroyed before indicator.
        this.menu.destroy();
        this.menu = null;
        this.indicator.destroy();
        this.indicator = null;
        this.inputpanel.destroy();
        this.inputpanel = null;
    }

    addToShell() {
        Main.uiGroup.add_child(this.menu.actor);
        this.menu.actor.hide();
        Main.layoutManager.addChrome(this.inputpanel.panel, {});
        Main.uiGroup.add_child(this.inputpanel._cursor);
        Main.panel.addToStatusArea('kimpanel', this.indicator);
    }

    updateInputPanel() {
        let inputpanel = this.inputpanel;

        this.showAux ? inputpanel.setAuxText(this.aux) : inputpanel.hideAux();
        this.showPreedit ? inputpanel.setPreeditText(this.preedit, this.pos)
                         : inputpanel.hidePreedit();

        this.inputpanel.setLookupTable(this.label, this.table,
                                       this.showLookupTable);
        this.inputpanel.setLookupTableCursor(this.cursor);
        this.inputpanel.updatePosition();
    }
    emit(signal) { this._impl.emit_signal(signal, null); }
    triggerProperty(arg) {
        this._impl.emit_signal('TriggerProperty',
                               GLib.Variant.new('(s)', [ arg ]));
    }
    selectCandidate(arg) {
        this._impl.emit_signal('SelectCandidate',
                               GLib.Variant.new('(i)', [ arg ]));
    }
    setRect(x, y, w, h, relative, scale) {
        if (this.x == x && this.y == y && this.w == w && this.h == h &&
            this.relative == relative && this.scale == scale) {
            return;
        }
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.relative = relative;
        this.scale = scale;
        this.updateInputPanel();
    }
    SetSpotRect(x, y, w, h) { this.setRect(x, y, w, h, false, 1); }
    SetRelativeSpotRect(x, y, w, h) { this.setRect(x, y, w, h, true, 1); }
    SetRelativeSpotRectV2(x, y, w, h, scale) {
        this.setRect(x, y, w, h, true, scale);
    }
    SetLookupTable(labels, texts, attrs, hasPrev, hasNext, cursor, layout) {
        this.label = labels;
        this.table = texts;
        this.cursor = cursor;
        this.layoutHint = layout;
        this.updateInputPanel();
        this.inputpanel.setVertical(this.isLookupTableVertical());
    }
    LockXkbGroup(idx) { Meta.get_backend().lock_layout_group(idx); }
}

export default class KimpanelExtension extends Extension {
    constructor(...args) {
        super(...args);
        this._settings = this.getSettings();
    }

    enable() {
        if (!kimpanel) {
            kimpanel = new Kimpanel(this._settings);
        }
    }

    disable() {
        kimpanel.destroy();
        kimpanel = null;
    }
}
// vim: set ts=4 sw=4 sts=4 expandtab
