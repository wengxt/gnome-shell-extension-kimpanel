const St = imports.gi.St;
const Cairo = imports.cairo;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Params = imports.misc.params;
const Lang = imports.lang;
const Meta = imports.gi.Meta;

const Me = imports.misc.extensionUtils.getCurrentExtension();
//const BoxPointer = imports.ui.boxpointer;
const BoxPointer = Me.imports.boxpointer;

const PanelItemProperty = { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.START };

const InputPanel = new Lang.Class({
    Name: "InputPanel",

    _init: function(params) {
        params = Params.parse(params, {kimpanel: null});
        this._arrowSide = St.Side.TOP;
        // create boxpointer as UI
        this.panel = new BoxPointer.BoxPointer(
            this._arrowSide,
            10,
            {
                x_fill: true,
                y_fill: true,
                x_align: St.Align.START
            });

        this.kimpanel = params.kimpanel;

        this.actor = this.panel.actor;
        this.actor._delegate = this;
        this.actor.style_class = 'popup-menu-boxpointer';
        this.actor.add_style_class_name('popup-menu');
        this.actor.add_style_class_name('minwidth-zero');

        this._cursor = new Shell.GenericContainer();

        this.layout = new St.BoxLayout({vertical: true, style:"padding: .4em;"});
        this.panel.bin.set_child(this.layout);

        this.upperLayout = new St.BoxLayout();
        this.separator = new Separator();
        this.separator.x_fill = true;
        this.separator.y_fill = true;
        this.separator.x_align = St.Align.MIDDLE;
        this.separator.y_align = St.Align.MIDDLE;

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
    },

    setAuxText: function(text) {
        if(!this.auxText.visible)
            this.auxText.show();
        this.auxText.set_text(text);
        let clutter_text = this.auxText.get_clutter_text();
        clutter_text.queue_redraw();
    },
    setPreeditText: function(text, pos) {
        if(!this.preeditText.visible)
            this.preeditText.show();
        let cat = text.substr(0, pos) + "|" + text.substr(pos);
        this.preeditText.set_text(cat);
        let clutter_text = this.preeditText.get_clutter_text();
        clutter_text.queue_redraw();
    },
    _candidateClicked: function(widget, event) {
        this.kimpanel.selectCandidate(widget.candidate_index);
    },
    setLookupTable: function( label, table, visible ) {
        let len = visible ? table.length : 0;
        let labelLen = this.lookupTableLayout.get_children().length;

        if (labelLen > 0 && len == 0) {
            this.layout.remove_child(this.separator.actor);
            this.layout.remove_child(this.lookupTableLayout);
        } else if (labelLen == 0 && len > 0) {
            this.layout.add_child(this.separator.actor);

            this.layout.add_child(this.lookupTableLayout);
        }

        // if number is not enough, create new
        if(len > labelLen) {
            for(let i = 0; i < len - labelLen; i++){
                let item = new St.Label({style_class:'kimpanel-candidate-item kimpanel-label-item',
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
            for (let i = 0; i < labelLen - len; i++){
                this.lookupTableLayout.get_children()[0].destroy();
            }
        }

        // update label and text
        let lookupTable = this.lookupTableLayout.get_children();
        for(let i=0;i<lookupTable.length;i++) {
            if (label[i].length == 0)
                lookupTable[i].ignore_focus = true;
            else
                lookupTable[i].ignore_focus = false;
            lookupTable[i].candidate_index = i;
            lookupTable[i].text = label[i] + (label[i].length != 0 ? ' ': '') + table[i];
        }
    },
    setLookupTableCursor: function(cursor) {
        let labelLen = this.lookupTableLayout.get_children().length;
        for (let i = 0; i < labelLen; i++) {
            if (i == cursor)
                this.lookupTableLayout.get_children()[i].add_style_pseudo_class('active');
            else
                this.lookupTableLayout.get_children()[i].remove_style_pseudo_class('active');
        }
    },
    setVertical: function(vertical){
        this.lookupTableLayout.set_vertical(vertical);
    },
    updateFont: function(textStyle){
        this.text_style = textStyle;
        this.auxText.set_style(this.text_style);
        this.preeditText.set_style(this.text_style);
        let lookupTable = this.lookupTableLayout.get_children();
        for(let i = 0; i < lookupTable.length; i++)
            lookupTable[i].set_style(this.text_style);
    },
    hideAux: function() {
        if(this.auxText.visible )
            this.auxText.hide();
    },
    hidePreedit: function() {
        if(this.preeditText.visible)
            this.preeditText.hide();
    },

    updatePosition: function() {
        let kimpanel = this.kimpanel;
        let x = kimpanel.x;
        let y = kimpanel.y;
        let w = kimpanel.w;
        let h = kimpanel.h;
        if (kimpanel.relative) {
            if (global.display.focus_window) {
                let window = global.display.focus_window.get_compositor_private();
                if (window) {
                    x += window.x;
                    y += window.y;
                }
            }
        }
        let rect = new Meta.Rectangle({ x: x, y: y, width: w, height: h });
        let monitor = Main.layoutManager.monitors[global.screen.get_monitor_index_for_rect(rect)];
        let panel_width = this.actor.get_width();
        let panel_height = this.actor.get_height();

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
    },

    show: function() {
            this.actor.opacity=255;
            this.actor.show();
    },
    hide: function() {
            this.actor.opacity=0;
            this.actor.hide();
    }

});

const Separator = new Lang.Class({
    Name: "Separator",

    _init: function (params) {
        this.actor = new St.DrawingArea({ style_class: 'kimpanel-separator'});
        this.actor.connect('repaint', Lang.bind(this, this._onRepaint));
    },

    _onRepaint: function(area) {
        let cr = area.get_context();
        let themeNode = area.get_theme_node();
        let [width, height] = area.get_surface_size();
        let margin = themeNode.get_length('-margin-horizontal');
        let gradientHeight = themeNode.get_length('-gradient-height');
        let startColor = themeNode.get_color('-gradient-start');
        let endColor = themeNode.get_color('-gradient-end');

        let gradientWidth = (width - margin*2 );
        let gradientOffset = (height - gradientHeight) / 2;
        let pattern = new Cairo.LinearGradient(margin, gradientOffset, width - margin, gradientOffset + gradientHeight);
        pattern.addColorStopRGBA(0, startColor.red / 255, startColor.green / 255, startColor.blue / 255, startColor.alpha / 255);
        pattern.addColorStopRGBA(0.2, endColor.red / 255, endColor.green / 255, endColor.blue / 255, endColor.alpha / 255);
        pattern.addColorStopRGBA(0.8, endColor.red / 255, endColor.green / 255, endColor.blue / 255, endColor.alpha / 255);
        pattern.addColorStopRGBA(1, startColor.red / 255, startColor.green / 255, startColor.blue / 255, startColor.alpha / 255);
        cr.setSource(pattern);
        cr.rectangle(margin, gradientOffset, gradientWidth, gradientHeight);
        cr.fill();
    }
});
