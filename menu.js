const {GObject, St, Clutter} = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Params = imports.misc.params;

const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;

const Lang = imports.lang;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

var KimMenu = class extends PopupMenu.PopupMenu {
    constructor(params){
        params = Params.parse(params, {
            sourceActor: null,
            arrowAlignMent: 0.0,
            arrowSide: St.Side.TOP,
            kimpanel: null
        });
        super(params.sourceActor, params.arrowAlignMent, params.arrowSide);
        this.connect('open-state-changed', Lang.bind(this, this._onOpenStateChanged));
        this.actor.connect('key-press-event', Lang.bind(this, this._onSourceKeyPress));
        this.grabbed = false;
        this._properties = {};
        this._propertySwitch = {};
        this.kimpanel = params.kimpanel;
    }

    execMenu(properties) {
        var p = null;
        for (p in this._propertySwitch) {
            this._propertySwitch[p].destroy();
            delete this._propertySwitch[p];
        }

        var count = 0;
        for( p in properties){
            count ++;
            var property = Lib.parseProperty( properties[p] );
            var key = property.key;
            this._properties[key] = property;
            this._addPropertyItem(key);
        }
        if (count != 0) {
            this.open(true);
        }
    }

    _addPropertyItem(key) {
        if ( key in this._properties )
        {
            var property = this._properties[key];
            var item = Lib.createMenuItem(property);

            item.connect('activate', Lang.bind(this, function(){
                this.kimpanel.triggerProperty(item._key);
            }));
            item.setIcon(property.icon);
            item.label.text = property.label;

            this._propertySwitch[key] = item;
            this.addMenuItem( this._propertySwitch[key]);
        }
    }

    _onSourceKeyPress(actor, event) {
        var symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_space || symbol == Clutter.KEY_Return) {
            this.toggle();
            return true;
        } else if (symbol == Clutter.KEY_Escape && this.isOpen) {
            this.close();
            return true;
        } else if (symbol == Clutter.KEY_Down) {
            if (!this.isOpen)
                this.toggle();
            this.actor.navigate_focus(this.actor, Gtk.DirectionType.DOWN, false);
            return true;
        } else
            return false;
    }

    _onOpenStateChanged(menu, open) {
        if (open) {
            if (!this.grabbed)
                this._grab();
        }
        else {
            if (this.grabbed)
                this._ungrab();
        }
        // Setting the max-height won't do any good if the minimum height of the
        // menu is higher then the screen; it's useful if part of the menu is
        // scrollable so the minimum height is smaller than the natural height
        var monitor = Main.layoutManager.primaryMonitor;
        this.actor.style = ('max-height: ' +
                                 Math.round(monitor.height - Main.panel.actor.height) +
                                 'px;');
    }

    _onHoverCapture(actor, event) {
        if (!this.grabbed)
            return false;

        return false;
    }

    _onEventCapture(actor, event) {
        if (!this.grabbed)
            return false;

        var activeMenuContains = this.actor.contains(event.get_source());

        var eventType = event.type();
        if (eventType == Clutter.EventType.BUTTON_RELEASE) {
            if (activeMenuContains) {
                return false;
            } else {
                this.close();
                return true;
            }
        } else if (eventType == Clutter.EventType.BUTTON_PRESS && !activeMenuContains) {
            this.close();
            return true;
        }
        return false;
    }

    _onKeyFocusChanged() {
        if (!this.grabbed)
            return;

        var focus = global.stage.key_focus;
        if (focus) {
            if (this.actor.contains(focus))
                return;
        }

        this.close();
    }

    _grab() {
        Main.pushModal(this.actor);

        this._eventCaptureId = global.stage.connect('captured-event', Lang.bind(this, this._onEventCapture));
        // captured-event doesn't see enter/leave events
        this._enterEventId = global.stage.connect('enter-event', Lang.bind(this, this._onHoverCapture));
        this._leaveEventId = global.stage.connect('leave-event', Lang.bind(this, this._onHoverCapture));
        this._keyFocusNotifyId = global.stage.connect('notify::key-focus', Lang.bind(this, this._onKeyFocusChanged));

        this.grabbed = true;
    }

    _ungrab() {
        global.stage.disconnect(this._eventCaptureId);
        this._eventCaptureId = 0;
        global.stage.disconnect(this._enterEventId);
        this._enterEventId = 0;
        global.stage.disconnect(this._leaveEventId);
        this._leaveEventId = 0;
        global.stage.disconnect(this._keyFocusNotifyId);
        this._keyFocusNotifyId = 0;
        this.grabbed = false;
        Main.popModal(this.actor);
    }
};
