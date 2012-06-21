const St = imports.gi.St;
const Cairo = imports.cairo;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Params = imports.misc.params;
const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const BoxPointer = imports.ui.boxpointer;
//const BoxPointer = Me.imports.boxpointer;
const Lib = Me.imports.lib;

const PanelItemProperty = { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.START };

const InputPanel = new Lang.Class({
    Name: "InputPanel",

    _init: function(params) {
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

        this.actor = this.panel.actor;
        this.actor._delegate = this;
        this.actor.style_class = 'popup-menu-boxpointer';
        this.actor.add_style_class_name('popup-menu');

        this._cursor = new Shell.GenericContainer();

        this.layout = new St.BoxLayout({vertical: true, style:"padding: .4em;"});
        this.panel.bin.set_child(this.layout);

        this.upperLayout = new St.BoxLayout();
        this.separator = new Separator();


        this.lookupTableVertical = Lib.isLookupTableVertical();
        this.lookupTableLayout = new St.BoxLayout({vertical:this.lookupTableVertical});

        this.layout.add(this.upperLayout, {});

        this.layout.add(this.separator.actor,
                        {x_fill: true, y_fill:false,
                         x_align: St.Align.MIDDLE,
                         y_align: St.Align.MIDDLE} );

        this.layout.add(this.lookupTableLayout, {});


        this.text_style = Lib.getTextStyle();
        this.auxText = new St.Label({style_class:'kimpanel-label', style: this.text_style, text:''});
        this.preeditText = new St.Label({style_class:'kimpanel-label', style: this.text_style, text:''});

        this.upperLayout.add(this.auxText, {x_fill: false, y_fill: true,
                                    x_align: St.Align.START,
                                    y_align: St.Align.MIDDLE} );

        this.upperLayout.add(this.preeditText, {x_fill: false, y_fill: true,
                                    x_align: St.Align.START,
                                    y_align: St.Align.MIDDLE} );

        this.kimpanel = params.kimpanel;
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
    setLookupTable: function( label, table ) {
        let len = table.length;
        let labelLen = this.lookupTableLayout.get_children().length;

        // if number is not enough, create new
        if(len > labelLen) {
            for(let i = 0; i < len - labelLen; i++){
                let item = new St.Label({style_class:'kimpanel-candidate-item kimpanel-label-item',
                                         style: this.text_style,
                                         text:'',
                                         reactive: true
                                        });
                item.candidate_index = labelLen + i;
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
            lookupTable[i].text = label[i] + table[i];
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
    updateFont: function(){
        this.text_style = Lib.getTextStyle();
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
        let monitor = Main.layoutManager.focusMonitor;
        let x = kimpanel.x;
        let y = kimpanel.y;
        let panel_width = this.actor.get_width();
        let panel_height = this.actor.get_height();

        y = y - 20;

        if (y + panel_height + 20 > monitor.y + monitor.height) {
            this._arrowSide = St.Side.BOTTOM;
        } else {
            this._arrowSide = St.Side.TOP;
        }

        this._cursor.set_position(x, y);
        this._cursor.set_size(20, 20);

        this.panel._arrowSide = this._arrowSide;
        this.panel.setArrowOrigin(this._arrowSide);

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
        this.actor = new St.DrawingArea({ style_class: ' popup-separator-menu-item',
                                          style:'height:2px;padding:.1em 0;' });
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
