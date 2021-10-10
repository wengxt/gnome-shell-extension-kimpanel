const {St, Clutter} = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Params = imports.misc.params;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

var KimMenu = class extends PopupMenu.PopupMenu {
    constructor(params) {
        params = Params.parse(params, {
            sourceActor : null,
            arrowAlignMent : 0.0,
            arrowSide : St.Side.TOP,
            kimpanel : null
        });
        super(params.sourceActor, params.arrowAlignMent, params.arrowSide);
        this.connect('open-state-changed', this._onOpenStateChanged.bind(this));
        this.actor.connect('key-press-event',
                           this._onSourceKeyPress.bind(this));
        this.grabbed = false;
        this._propertySwitch = [];
        this.kimpanel = params.kimpanel;
    }

    execMenu(properties) {
        for (let i = 0; i < this._propertySwitch.length; i++) {
            this._propertySwitch[i].destroy();
        }
        this._propertySwitch = [];

        for (let i = 0; i < properties.length; i++) {
            var property = Lib.parseProperty(properties[i]);
            this._addPropertyItem(property);
        }
        if (properties.length > 0) {
            this.open(true);
        }
    }

    _addPropertyItem(property) {
        var item = Lib.createMenuItem(property);

        item.connect('activate',
                     () => this.kimpanel.triggerProperty(item._key));
        item.setIcon(property.icon);
        item.label.text = property.label;

        this._propertySwitch.push(item);
        this.addMenuItem(item);
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
            this.actor.navigate_focus(this.actor, St.DirectionType.TAB_FORWARD,
                                      false);
            return true;
        } else
            return false;
    }

    _onOpenStateChanged(menu, open) {
        if (open) {
            if (!this.grabbed)
                this._grab();
        } else {
            if (this.grabbed)
                this._ungrab();
        }
        // Setting the max-height won't do any good if the minimum height of the
        // menu is higher then the screen; it's useful if part of the menu is
        // scrollable so the minimum height is smaller than the natural height
        var monitor = Main.layoutManager.primaryMonitor;
        this.actor.style =
            ('max-height: ' +
             Math.round(monitor.height - Main.panel.actor.height) + 'px;');
    }

    _onHoverCapture() {
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
        } else if (eventType == Clutter.EventType.BUTTON_PRESS &&
                   !activeMenuContains) {
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

        this._eventCaptureId = global.stage.connect(
            'captured-event', this._onEventCapture.bind(this));
        // captured-event doesn't see enter/leave events
        this._enterEventId = global.stage.connect(
            'enter-event', this._onHoverCapture.bind(this));
        this._leaveEventId = global.stage.connect(
            'leave-event', this._onHoverCapture.bind(this));
        this._keyFocusNotifyId = global.stage.connect(
            'notify::key-focus', this._onKeyFocusChanged.bind(this));

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
