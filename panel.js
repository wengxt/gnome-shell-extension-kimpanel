const St = imports.gi.St;

const Shell = imports.gi.Shell;
const BoxPointer = imports.ui.boxpointer;
const Main = imports.ui.main;

const Lang = imports.lang;

inputPanel.prototype = {
    _init: function(kimpanel) {
        //this.panel = new St.Label({ style_class: 'kimpanel-label', text: '' , visible: false});

        this.panel = new BoxPointer.BoxPointer(St.Side.TOP,
                                                     { x_fill: true,
                                                       y_fill: true,
                                                       x_align: St.Align.START });
        
        this.actor = this.panel.actor;
        this.actor.style_class = 'popup-menu-boxpointer';
        this.actor.add_style_class_name('popup-menu');
        
        this._cursor = new Shell.GenericContainer();
        
        this.layout = new St.BoxLayout({vertical: true});
        this.panel.bin.set_child(this.layout);

        this.content = new St.Label({style_class: 'popup-menu-item',
                                     style: 'color: #fff;',
                                     text: ''}); 

        this.layout.add(this.content, {x_fill: false,
                                    y_fill: false,
                                    x_align: St.Align.START,
                                    y_align: St.Align.MIDDLE} ); 
        this.kimpanel = kimpanel;
        this.hide();
    },

    setText: function(text) {
        this.content.text = text;
    },
    updatePosition: function() {
        let kimpanel = this.kimpanel;
        let monitor = Main.layoutManager.focusMonitor;
        let x = kimpanel.x;
        let y = kimpanel.y;
        let panel_width = this.actor.get_width();
        let panel_height = this.actor.get_height();
        

        if (x + panel_width > monitor.width)
            x = monitor.width - panel_width;
        if (y + panel_height > monitor.height)
        {
            y = y - panel_height - 20;
            let arrowSide = St.Side.BOTTOM;
        }else{
            let arrowSide = St.Side.TOP;
        }
        if (x < 0)
            x = 0;
        if (y < 0)
            y = 0;

        //this._cursor.set_position(x, y);
        //this._cursor.set_size(20, 20);
        //
        ////this.panel.setArrowOrigin(arrowSide);
        //this.panel.setPostion(this._cursor, 0.0);
        
        //this.panel.set_position(x, y);

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
