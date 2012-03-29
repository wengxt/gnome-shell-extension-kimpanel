const St = imports.gi.St;

const Cairo = imports.cairo;
const Shell = imports.gi.Shell;
const BoxPointer = imports.ui.boxpointer;
const Main = imports.ui.main;
const Lang = imports.lang;

inputPanel.prototype = {
    _init: function(kimpanel) {
        //this.panel = new St.Label({ style_class: 'kimpanel-label', text: '' , visible: false});
        this._arrowSide = St.Side.TOP;
        this.panel = new BoxPointer.BoxPointer(this._arrowSide,
                                                     { x_fill: true,
                                                       y_fill: true,
                                                       x_align: St.Align.START });
        
        this.actor = this.panel.actor;
        this.actor.style_class = 'popup-menu-boxpointer';
        this.actor.add_style_class_name('popup-menu');
        
        this._cursor = new Shell.GenericContainer();
        
        this.layout = new St.BoxLayout({vertical: true, style:"padding: .4em;"});
        this.panel.bin.set_child(this.layout);
        
        this.upperLayout = new St.BoxLayout();
        this.separator = new Separator();
        this.lowerLayout = new St.BoxLayout();
        
        
        this.layout.add(this.upperLayout, {});

        this.layout.add(this.separator.actor, 
                        {x_fill: true, y_fill:false, 
                         x_align: St.Align.MIDDLE,
                         y_align: St.Align.MIDDLE} ); 

        this.layout.add(this.lowerLayout, {});

        this.auxText = new St.Label({style_class:'popup-menu-item', style:"padding:0;", text:''}); 
        this.preeditText = new St.Label({style_class:'popup-menu-item', style:"padding:0;", text:''}); 
        this.lookupTable = new St.Label({style_class:'popup-menu-item', style:"padding:0;",text:''}); 
      
        this.upperLayout.add(this.auxText, {x_fill: false, y_fill: true,
                                    x_align: St.Align.START,
                                    y_align: St.Align.MIDDLE} ); 
        this.upperLayout.add(this.preeditText, {x_fill: false, y_fill: true,
                                    x_align: St.Align.START,
                                    y_align: St.Align.MIDDLE} ); 
        this.lowerLayout.add(this.lookupTable, {x_fill: true, y_fill: true,
                                    x_align: St.Align.START,
                                    y_align: St.Align.MIDDLE} ); 
       
        this.kimpanel = kimpanel;
        this.hide();
    },

    setAuxText: function(text) {
        if(!this.auxText.visible)
            this.auxText.show();
        this.auxText.text = text;
    },
    setPreeditText: function(text) {
        if(!this.preeditText.visible)
            this.preeditText.show();
        this.preeditText.text = text;
    },
    setLookupTable: function(text) {
        this.lookupTable.text = text;
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
        
        if (y + panel_height + 20 > monitor.y + monitor.height)
        {
            this._arrowSide = St.Side.BOTTOM;
        }else{
            this._arrowSide = St.Side.TOP;
        }
        
        this._cursor.set_position(x, y);
        this._cursor.set_size(20, 20);
        
        this.panel._arrowSide = this._arrowSide;
        this.panel.setArrowOrigin(this._arrowSide);
        
        this.panel.setPosition(this._cursor, 0.0);
        

        this.visible = kimpanel.showAux || kimpanel.showPreedit || kimpanel.showLookupTable;
        this.visible ? this.show() : this.hide();
    },

    show: function() {
            this.actor.opacity=255;
            this.actor.show(); 
    },
    hide: function() {
            this.actor.opacity=0;
            this.actor.hide();
    }

}

function inputPanel(kimpanel) {
    this._init.apply(this, arguments);
}


function Separator() {
    this._init();
}

Separator.prototype = {

    _init: function () {
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
};
