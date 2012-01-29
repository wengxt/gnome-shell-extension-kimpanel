const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;
const Main = imports.ui.main;

const Lang = imports.lang;

kimIcon.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function(kimpanel){
        this._properties = {
            "/Fcitx/im":{}, 
            "/Fcitx/chttrans":{},
            "/Fcitx/punc":{},
            "/Fcitx/fullwidth":{},
            "/Fcitx/remind":{}
        };
        this._propertySwitch = {};

        PanelMenu.SystemStatusButton.prototype._init.call(this, 'input-keyboard');
        
        this.kimpanel = kimpanel;

        this._setting = new PopupMenu.PopupMenuItem("Settings");
        this._setting.connect('activate', Lang.bind(this, function(){
            this.kimpanel.emit('Configure');
        }));
        this._reload = new PopupMenu.PopupMenuItem("Reload Configuration");
        this._reload.connect('activate', Lang.bind(this, function(){
            this.kimpanel.emit('ReloadConfig');
        }));
        this._menuSection = new PopupMenu.PopupMenuSection();
        this._initProperties(); 
        
        this.menu.addMenuItem(this._menuSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._reload);
        this.menu.addMenuItem(this._setting);
    },
    
    _parseProperty: function(property) {
        let p = property.split(":");
        key = p[0];
        if( key in this._properties ){
            this._properties[key] = {
                'label': p[1],
                'icon': p[2],
                'text': p[3]
            }
        }
    },
    
    
    _initProperties: function() {
        for ( key in this._properties )
        {
            if( key == '/Fcitx/im')
                continue;
            let item = new PopupMenu.PopupImageMenuItem("","");
            let _icon = new St.Icon({
                        icon_name:'fcitx',
                        icon_type: St.IconType.FULLCOLOR, 
                        style_class: 'popup-menu-icon'
                        });
            item._icon = _icon;
            item.addActor(item._icon);
            item._key = key;
            
            item.connect('activate', Lang.bind(this, function(){
                this.kimpanel.triggerProperty(item._key);
            }));
            
            this._propertySwitch[key] = item;
            this.menu.addMenuItem(this._propertySwitch[key]);
        }
    },

    _updateProperties: function( ) {
        for ( key in this._propertySwitch )
        {
            let property = this._properties[key];
            let item = this._propertySwitch[key]; 
            item.setIcon(property.icon);
            item.label.text = property.label;
        }
    },

    _clearActor: function() {
        if (this._iconActor != null) {
            this.actor.remove_actor(this._iconActor);
            this._iconActor.destroy();
            this._iconActor = null;
            this._iconName = null;
        }
        if (this._labelActor) {
            this.actor.remove_actor(this._labelActor);
            this._labelActor.destroy();
            this._labelActor = null;
            this._label = null;
        }
    },
    
    _setIcon: function(iconName,type) {
        this._clearActor();
        this._iconName = iconName;
        this._iconActor = new St.Icon({ icon_name: iconName,
                                        icon_type: type,
                                        style_class: 'system-status-icon' });
        this.actor.add_actor(this._iconActor);
        this.actor.queue_redraw();
    },

    _active: function(){
         this._setIcon(this._properties['/Fcitx/im'].icon,St.IconType.FULLCOLOR);   
    },

    _deactive: function(){
        this._setIcon('input-keyboard',St.IconType.SYMBOLIC);
    }
}

function kimIcon(kimpanel) {
    this._init.apply(this, arguments);
}

