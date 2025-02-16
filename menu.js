import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Params from 'resource:///org/gnome/shell/misc/params.js';

import * as Lib from './lib.js'

export class KimMenu extends PopupMenu.PopupMenu {
    constructor(params) {
        params = Params.parse(params, {
            sourceActor : null,
            arrowAlignment : 0.5,
            arrowSide : St.Side.TOP,
            kimpanel : null
        });
        super(params.sourceActor, params.arrowAlignment, params.arrowSide);
        this._openStateChangedId = this.connect(
            'open-state-changed', this._onOpenStateChanged.bind(this));
        this._kimKeyPressId = this.actor.connect(
            'key-press-event', this._onSourceKeyPress.bind(this));
        this.grabbed = false;
        this._propertySwitch = [];
        this.kimpanel = params.kimpanel;
    }

    destroy() {
        this.disconnect(this._openStateChangedId);
        this.actor.disconnect(this._kimKeyPressId);
        if (this.grabbed) {
            this._ungrab();
        }
        this.execMenu([]);
        this.kimpanel = null;
        super.destroy();
    }

    execMenu(properties) {
        for (let i = 0; i < this._propertySwitch.length; i++) {
            this._propertySwitch[i].destroy();
        }
        this._propertySwitch = [];

        for (let i = 0; i < properties.length; i++) {
            let property = Lib.parseProperty(properties[i]);
            this._addPropertyItem(property);
        }
        if (properties.length > 0) {
            this.open(true);
        }
    }

    _addPropertyItem(property) {
        let item = Lib.createMenuItem(property);

        item._menuItemActivateId = item.connect(
            'activate', () => this.kimpanel.triggerProperty(item._key));
        item._menuItemDestroyId = item.connect('destroy', () => {
            item.disconnect(item._menuItemActivateId);
            item.disconnect(item._menuItemDestroyId);
        });
        item.setIcon(property.icon);
        item.label.text = property.label;

        this._propertySwitch.push(item);
        this.addMenuItem(item);
    }

    _onSourceKeyPress(actor, event) {
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
        let monitor = Main.layoutManager.primaryMonitor;
        this.actor.style =
            ('max-height: ' +
             Math.round(monitor.height - Main.panel.height) + 'px;');
    }

    _onHoverCapture() {
        if (!this.grabbed)
            return false;

        return false;
    }

    _onEventCapture(actor, event) {
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

        let focus = global.stage.key_focus;
        if (focus) {
            if (this.actor.contains(focus))
                return;
        }

        this.close();
    }

    _grab() {
        this._grabHandle = Main.pushModal(this.actor);

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
        Main.popModal(this._grabHandle);
    }
};
