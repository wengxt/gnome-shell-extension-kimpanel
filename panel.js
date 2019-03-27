const {St, GObject, Shell, Meta} = imports.gi;
const Cairo = imports.cairo;
const Main = imports.ui.main;
const Params = imports.misc.params;
const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const BoxPointer = imports.ui.boxpointer;

const PanelItemProperty = { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.START };

var InputPanel = GObject.registerClass(
class InputPanel extends GObject.Object {

    _init(params) {
        params = Params.parse(params, {kimpanel: null});
        this._arrowSide = St.Side.TOP;
        // create boxpointer as UI
        this.panel = new BoxPointer.BoxPointer(
            this._arrowSide,
            {
                x_fill: true,
                y_fill: true,
                x_align: St.Align.START
            });

        this.kimpanel = params.kimpanel;

        this.actor = this.panel;
        this.actor._delegate = this;
        this.actor.style_class = 'popup-menu-boxpointer';
        this.actor.add_style_class_name('popup-menu');
        this.actor.add_style_class_name('minwidth-zero');

        this._cursor = new St.Label({});

        this.layout = new St.BoxLayout({vertical: true, style:"padding: .4em;"});
        this.panel.bin.set_child(this.layout);

        this.upperLayout = new St.BoxLayout();

        this.lookupTableVertical = this.kimpanel.isLookupTableVertical();
        this.lookupTableLayout = new St.BoxLayout({vertical:this.lookupTableVertical});

        this.layout.add_child(this.upperLayout);

        this.text_style = this.kimpanel.getTextStyle();
        this.auxText = new St.Label({style_class:'kimpanel-label', style: this.text_style, text:''});
        this.preeditText = new St.Label({style_class:'kimpanel-label', style: this.text_style, text:''});

        this.upperLayout.add(this.auxText, {x_fill: false, y_fill: true,
                                    x_align: St.Align.START,
                                    y_align: St.Align.MIDDLE} );

        this.upperLayout.add(this.preeditText, {x_fill: false, y_fill: true,
                                    x_align: St.Align.START,
                                    y_align: St.Align.MIDDLE} );
        this.hide();
        this.actor.hide();
    }

    setAuxText(text) {
        if(!this.auxText.visible)
            this.auxText.show();
        this.auxText.set_text(text);
        var clutter_text = this.auxText.get_clutter_text();
        clutter_text.queue_redraw();
    }
    setPreeditText(text, pos) {
        if(!this.preeditText.visible)
            this.preeditText.show();
        var cat = text.substr(0, pos) + "|" + text.substr(pos);
        this.preeditText.set_text(cat);
        var clutter_text = this.preeditText.get_clutter_text();
        clutter_text.queue_redraw();
    }
    _candidateClicked(widget, event) {
        this.kimpanel.selectCandidate(widget.candidate_index);
    }
    setLookupTable( label, table, visible ) {
        var len = visible ? table.length : 0;
        var labelLen = this.lookupTableLayout.get_children().length;

        if (labelLen > 0 && len == 0) {
            this.layout.remove_child(this.lookupTableLayout);
        } else if (labelLen == 0 && len > 0) {
            this.layout.add_child(this.lookupTableLayout);
        }

        // if number is not enough, create new
        if(len > labelLen) {
            for(var i = 0; i < len - labelLen; i++){
                var item = new St.Label({style_class:'kimpanel-candidate-item kimpanel-label-item',
                                         style: this.text_style,
                                         text:'',
                                         reactive: true
                                        });
                item.candidate_index = 0;
                item.ignore_focus = true;
                item.connect('button-release-event',
                             Lang.bind(this, function (widget, event) {
                                 if (!widget.ignore_focus)
                                    this._candidateClicked(widget, event);
                             }));
                item.connect('enter-event',
                             function(widget, event) {
                                 if (!widget.ignore_focus)
                                    widget.add_style_pseudo_class('hover');
                             });
                item.connect('leave-event',
                             function(widget, event) {
                                 if (!widget.ignore_focus)
                                    widget.remove_style_pseudo_class('hover');
                             });
                this.lookupTableLayout.add(item, PanelItemProperty);
            }
        }
        else if (len < labelLen ) {
            // else destroy unnecessary one
            for (var i = 0; i < labelLen - len; i++){
                this.lookupTableLayout.get_children()[0].destroy();
            }
        }

        // update label and text
        var lookupTable = this.lookupTableLayout.get_children();
        for(var i=0;i<lookupTable.length;i++) {
            if (label[i].length == 0)
                lookupTable[i].ignore_focus = true;
            else
                lookupTable[i].ignore_focus = false;
            lookupTable[i].candidate_index = i;
            lookupTable[i].text = label[i] + (label[i].length != 0 ? ' ': '') + table[i];
        }
    }
    setLookupTableCursor(cursor) {
        var labelLen = this.lookupTableLayout.get_children().length;
        for (var i = 0; i < labelLen; i++) {
            if (i == cursor)
                this.lookupTableLayout.get_children()[i].add_style_pseudo_class('active');
            else
                this.lookupTableLayout.get_children()[i].remove_style_pseudo_class('active');
        }
    }
    setVertical(vertical){
        this.lookupTableLayout.set_vertical(vertical);
    }
    updateFont(textStyle){
        this.text_style = textStyle;
        this.auxText.set_style(this.text_style);
        this.preeditText.set_style(this.text_style);
        var lookupTable = this.lookupTableLayout.get_children();
        for(var i = 0; i < lookupTable.length; i++)
            lookupTable[i].set_style(this.text_style);
    }
    hideAux() {
        if(this.auxText.visible )
            this.auxText.hide();
    }
    hidePreedit() {
        if(this.preeditText.visible)
            this.preeditText.hide();
    }

    updatePosition() {
        var kimpanel = this.kimpanel;
        var x = kimpanel.x;
        var y = kimpanel.y;
        var w = kimpanel.w;
        var h = kimpanel.h;
        if (kimpanel.relative) {
            if (global.display.focus_window) {
                var window = global.display.focus_window.get_compositor_private();
                if (window) {
                    x += window.x;
                    y += window.y;
                }
            }
        }
        var rect = new Meta.Rectangle({ x: x, y: y, width: w, height: h });
        var monitor = Main.layoutManager.monitors[global.display.get_monitor_index_for_rect(rect)];
        var panel_width = this.actor.get_width();
        var panel_height = this.actor.get_height();

        if (h == 0) {
            h = 20;
            y = y - 20;
        }

        if (y + panel_height + h > monitor.y + monitor.height) {
            this._arrowSide = St.Side.BOTTOM;

            if (y + h > monitor.y + monitor.height) {
                y = monitor.y + monitor.height - 1;
                h = 1;
            }
        } else {
            this._arrowSide = St.Side.TOP;
        }

        if (x < monitor.x) {
            x = monitor.x;
        }
        if (x + panel_width > monitor.x + monitor.width) {
            x = monitor.x + monitor.width;
        }

        this._cursor.set_position(x, y);
        this._cursor.set_size((w == 0? 1 : w), (h == 0? 1 : h));

        this.panel._arrowSide = this._arrowSide;
        this.panel.setPosition(this._cursor, 0.0);


        this.visible = kimpanel.showAux || kimpanel.showPreedit || kimpanel.showLookupTable;
        if (this.visible) {
            this.show();
            this.actor.raise_top();
        }
        else
            this.hide();
    }

    show() {
	    this.panel.open(BoxPointer.PopupAnimation.NONE);
    }
    hide() {
	    this.panel.close(BoxPointer.PopupAnimation.NONE);
    }

});
