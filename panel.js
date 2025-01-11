import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Mtk from 'gi://Mtk';
import Pango from 'gi://Pango';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Params from 'resource:///org/gnome/shell/misc/params.js';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';

function createLabel(params) {
    let label = new St.Label(params);
    label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
    label.clutter_text.line_wrap = false;
    return label;
}

export class InputPanel extends GObject.Object {
    static {
        GObject.registerClass(this);
    }

    _init(params) {
        params = Params.parse(params, {kimpanel : null});
        this.kimpanel = params.kimpanel;
        this._arrowSide = St.Side.TOP;
        // create boxpointer as UI
        this.panel = new BoxPointer.BoxPointer(this._arrowSide,
                                               {x_align : Clutter.ActorAlign.START});
        this.panel.style_class = 'popup-menu-boxpointer';
        this.panel.add_style_class_name('popup-menu');
        this.panel.add_style_class_name('minwidth-zero');
        this.panel.add_style_class_name('kimpanel-popup-boxpointer');

        this._cursor = new St.Label({});

        this.layout = new St.BoxLayout({
            style_class : 'popup-menu-content',
            vertical : true,
        });
        this.layout.add_style_class_name('kimpanel-popup-content');
        this.panel.bin.set_child(this.layout);

        this.upperLayout = new St.BoxLayout();
        this.lookupTableLayout = new St.BoxLayout(
            {vertical : this.kimpanel.isLookupTableVertical()});

        this.layout.add_child(this.upperLayout);

        this.text_style = this.kimpanel.getTextStyle();
        this.auxText = createLabel({
            style_class : 'kimpanel-label',
            style : this.text_style,
            text : ''
        });
        this.preeditText = createLabel({
            style_class : 'kimpanel-label',
            style : this.text_style,
            text : ''
        });

        this.upperLayout.add_child(this.auxText);
        this.upperLayout.add_child(this.preeditText);
        this.hide();
        this.panel.hide();
    }

    destroy() {
        if (!this.kimpanel) {
            return;
        }
        this.kimpanel = null;
        this.layout = null;
        this.upperLayout = null;
        this.lookupTableLayout = null;
        this.auxText = null;
        this.preeditText = null;
        this.panel.destroy();
        this.panel = null;
        this._cursor.destroy();
        this._cursor = null;
    }

    setAuxText(text) {
        this.auxText.set_text(text);
        if (!this.auxText.visible) {
            this.auxText.show();
        }
    }
    setPreeditText(text, pos) {
        let charArray = [...text ];
        let cat = charArray.slice(0, pos).join('') + "|" +
                  charArray.slice(pos).join('');
        this.preeditText.set_text(cat);
        if (!this.preeditText.visible)
            this.preeditText.show();
    }
    _candidateClicked(widget) {
        this.kimpanel.selectCandidate(widget.candidate_index);
    }
    setLookupTable(label, table, visible) {
        let len = visible ? table.length : 0;
        let labelLen = this.lookupTableLayout.get_children().length;

        if (labelLen > 0 && len == 0) {
            this.layout.remove_child(this.lookupTableLayout);
        } else if (labelLen == 0 && len > 0) {
            this.layout.add_child(this.lookupTableLayout);
        }

        // if number is not enough, create new
        if (len > labelLen) {
            for (let i = 0; i < len - labelLen; i++) {
                let item = createLabel({
                    style_class : 'popup-menu-item kimpanel-label',
                    style : this.text_style,
                    text : '',
                    reactive : true
                });
                item.add_style_class_name('kimpanel-candidate-item');
                item.candidate_index = 0;
                item.ignore_focus = true;
                item._buttonReleaseId =
                    item.connect('button-release-event', (widget) => {
                        if (!widget.ignore_focus)
                            this._candidateClicked(widget);
                    });
                item._enterEventId = item.connect('enter-event', (widget) => {
                    if (!widget.ignore_focus)
                        widget.add_style_pseudo_class('hover');
                });
                item._leaveEventId = item.connect('leave-event', (widget) => {
                    if (!widget.ignore_focus)
                        widget.remove_style_pseudo_class('hover');
                });
                item._labelDestroyId = item.connect('destroy', () => {
                    item.disconnect(item._buttonReleaseId);
                    item.disconnect(item._enterEventId);
                    item.disconnect(item._leaveEventId);
                    item.disconnect(item._labelDestroyId);
                });
                this.lookupTableLayout.add_child(item);
            }
        } else if (len < labelLen) {
            // else destroy unnecessary one
            for (let i = 0; i < labelLen - len; i++) {
                this.lookupTableLayout.get_children()[0].destroy();
            }
        }

        // update label and text
        let lookupTable = this.lookupTableLayout.get_children();
        for (let i = 0; i < lookupTable.length; i++) {
            if (label[i].length == 0)
                lookupTable[i].ignore_focus = true;
            else
                lookupTable[i].ignore_focus = false;
            lookupTable[i].candidate_index = i;
            lookupTable[i].text = label[i] + table[i];
        }
    }
    setLookupTableCursor(cursor) {
        let labelLen = this.lookupTableLayout.get_children().length;
        for (var i = 0; i < labelLen; i++) {
            if (i == cursor)
                this.lookupTableLayout.get_children()[i].add_style_pseudo_class(
                    'active');
            else
                this.lookupTableLayout.get_children()[i]
                    .remove_style_pseudo_class('active');
        }
    }
    setVertical(vertical) { this.lookupTableLayout.set_vertical(vertical); }
    updateFont(textStyle) {
        this.text_style = textStyle;
        this.auxText.set_style(this.text_style);
        this.preeditText.set_style(this.text_style);
        let lookupTable = this.lookupTableLayout.get_children();
        for (let i = 0; i < lookupTable.length; i++)
            lookupTable[i].set_style(this.text_style);
    }
    hideAux() {
        if (this.auxText.visible)
            this.auxText.hide();
    }
    hidePreedit() {
        if (this.preeditText.visible)
            this.preeditText.hide();
    }

    updatePosition() {
        let kimpanel = this.kimpanel;
        let x = kimpanel.x;
        let y = kimpanel.y;
        let w = kimpanel.w;
        let h = kimpanel.h;
        let rect;
        const focusWindow = global.display.focus_window;
        if (kimpanel.relative && focusWindow) {
            let shellScale =
                St.ThemeContext.get_for_stage(global.stage).scale_factor;
            rect = new Mtk.Rectangle({
                x : x * (shellScale / kimpanel.scale),
                y : y * (shellScale / kimpanel.scale),
                width : w * (shellScale / kimpanel.scale),
                height : h * (shellScale / kimpanel.scale)}
            );
            rect = focusWindow.protocol_to_stage_rect(rect);
            let window =
                global.display.focus_window.get_compositor_private();
            if (window) {
                rect.x += window.x;
                rect.y += window.y;
            }
        } else {
            rect = new Mtk.Rectangle({x : x, y : y, width : w, height : h});
            if (focusWindow) {
                rect = focusWindow.protocol_to_stage_rect(rect);
            }
        }
        // Based on the implementation, it should always return an index
        // Unless there is no monitor at all.
        let monitorIndex = global.display.get_monitor_index_for_rect(rect);
        let monitor = null;
        if (monitorIndex >= 0 && monitorIndex < Main.layoutManager.monitors.length) {
            monitor = Main.layoutManager.monitors[monitorIndex];
        }

        x = rect.x;
        y = rect.y;
        w = rect.w;
        h = rect.h;

        let panel_height = this.panel.get_height();

        if (h == 0) {
            h = 20;
            y = y - 20;
        }

        // Cap the position within monitor.
        if (monitor) {
            if (y + panel_height + h >= monitor.y + monitor.height) {
                this._arrowSide = St.Side.BOTTOM;

                if (y + h >= monitor.y + monitor.height) {
                    y = monitor.y + monitor.height - 1;
                    h = 1;
                }
            } else {
                this._arrowSide = St.Side.TOP;
            }

            if (x < monitor.x) {
                x = monitor.x;
            }
            if (x >= monitor.x + monitor.width) {
                x = monitor.x + monitor.width - 1;
            }
        }

        this._cursor.set_position(x, y);
        this._cursor.set_size((w == 0 ? 1 : w), (h == 0 ? 1 : h));

        this.panel._arrowSide = this._arrowSide;

        this.visible = kimpanel.showAux || kimpanel.showPreedit ||
                       kimpanel.showLookupTable;
        if (this.visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    show() {
        this.panel.setPosition(this._cursor, 0.0);
        this.panel.open(BoxPointer.PopupAnimation.NONE);
        this.panel.get_parent().set_child_above_sibling(this.panel, null);
    }
    hide() { this.panel.close(BoxPointer.PopupAnimation.NONE); }
}
