const Main = imports.ui.main;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const PopupMenu = imports.ui.popupMenu;
const Params = imports.misc.params;

const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;

const Lang = imports.lang;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

const KimMenu = new Lang.Class({
    Name: "KimMenu",
    Extends: PopupMenu.PopupMenu,

    _init: function(params){
        params = Params.parse(params, {
            sourceActor: null,
            arrowAlignMent: 0.0,
            arrowSide: St.Side.TOP,
            kimpanel: null
        });
        this.parent(params.sourceActor, params.arrowAlignMent, params.arrowSide);
        this.connect('open-state-changed', Lang.bind(this, this._onOpenStateChanged));
        this.actor.connect('key-press-event', Lang.bind(this, this._onSourceKeyPress));
        this.grabbed = false;
        this._properties = {};
        this._propertySwitch = {};
        this.kimpanel = params.kimpanel;
    },

    execMenu: function(properties) {
        let p = null;
        for (p in this._propertySwitch) {
            this._propertySwitch[p].destroy();
            delete this._propertySwitch[p];
        }

        let count = 0;
        for( p in properties){
            count ++;
            let property = Lib.parseProperty( properties[p] );
            let key = property.key;
            this._properties[key] = property;
            this._addPropertyItem(key);
        }
        if (count != 0) {
            this.open(true);
        }
    },

    _addPropertyItem: function(key) {
        if ( key in this._properties )
        {
            let property = this._properties[key];
            let item = Lib.createMenuItem(property);

            item.connect('activate', Lang.bind(this, function(){
                this.kimpanel.triggerProperty(item._key);
            }));
            item.setIcon(property.icon);
            item.label.text = property.label;

            this._propertySwitch[key] = item;
            this.addMenuItem( this._propertySwitch[key]);
        }
    },

    _onSourceKeyPress: function(actor, event) {
        let symbol = event.get_key_symbol();
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
    },

    _onOpenStateChanged: function(menu, open) {
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
        let monitor = Main.layoutManager.primaryMonitor;
        this.actor.style = ('max-height: ' +
                                 Math.round(monitor.height - Main.panel.actor.height) +
                                 'px;');
    },
    _onHoverCapture: function(actor, event) {
        if (!this.grabbed)
            return false;

        return false;
    },

    _onEventCapture: function(actor, event) {
        if (!this.grabbed)
            return false;

        let activeMenuContains = this.actor.contains(event.get_source());

        let eventType = event.type();
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
    },

    _onKeyFocusChanged: function() {
        if (!this.grabbed)
            return;

        let focus = global.stage.key_focus;
        if (focus) {
            if (this.actor.contains(focus))
                return;
        }

        this.close();
    },

    _grab: function() {
        Main.pushModal(this.actor);

        this._eventCaptureId = global.stage.connect('captured-event', Lang.bind(this, this._onEventCapture));
        // captured-event doesn't see enter/leave events
        this._enterEventId = global.stage.connect('enter-event', Lang.bind(this, this._onHoverCapture));
        this._leaveEventId = global.stage.connect('leave-event', Lang.bind(this, this._onHoverCapture));
        this._keyFocusNotifyId = global.stage.connect('notify::key-focus', Lang.bind(this, this._onKeyFocusChanged));

        this.grabbed = true;
    },

    _ungrab: function() {
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
    },

});
