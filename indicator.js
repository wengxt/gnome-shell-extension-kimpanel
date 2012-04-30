const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Params = imports.misc.params;
const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;
const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

const KimIcon = new Lang.Class({
    Name: "KimIcon",
    Extends: PanelMenu.SystemStatusButton,

    _init: function(params){
        params = Params.parse(params, {kimpanel: null});
        this._properties = {};
        this._propertySwitch = {};

        PanelMenu.SystemStatusButton.prototype._init.call(this, 'input-keyboard', 'kimpanel');

        this.kimpanel = params.kimpanel;

        this._setting = new PopupMenu.PopupMenuItem(_("Settings"));
        this._setting.connect('activate', Lang.bind(this, function(){
            this.kimpanel.emit('Configure');
        }));
        this._reload = new PopupMenu.PopupMenuItem(_("Reload Configuration"));
        this._reload.connect('activate', Lang.bind(this, function(){
            this.kimpanel.emit('ReloadConfig');
        }));

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._reload);
        this.menu.addMenuItem(this._setting);
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
            this.menu.addMenuItem( this._propertySwitch[key], this.menu.numMenuItems - 3 );
        }
    },

    _updatePropertyItem: function(key) {
        let property = this._properties[key];
        let item = this._propertySwitch[key]; 
        item.setIcon(property.icon);
        item.label.text = property.label;
        return;
    },

    _updateProperty: function(propstr) {
        let property = Lib.parseProperty(propstr);
        let key = property.key;
        this._properties[key] = property;
        this._updateProperties();
    },

    _updateProperties: function( properties ) {
        if( properties == undefined )
        {
            for ( key in this._propertySwitch )
            {
                let property = this._properties[key];
                let item = this._propertySwitch[key]; 
                item.setIcon(property.icon);
                item.label.text = property.label;
            }
            return;
        } else {
            for (p in this._propertySwitch) {
                if (properties[p] == undefined) {
                    this._propertySwitch[p].destroy();
                    delete this._propertySwitch[p];
                }
            }

            let count = 0;
            for( p in properties) {
                count ++;
                let property = Lib.parseProperty( properties[p] );
                let key = property.key;
                this._properties[key] = property;
                if( key in this._propertySwitch )
                    this._updatePropertyItem(key);
                else
                    this._addPropertyItem(key);
            }
            if (count != 0) {
                this.visible = false;
            }
            else
                this.visible = true;
        }
    },

    _clearActor: function() {
        if (this._iconActor != null) {
            this.actor.remove_actor(this._iconActor);
            this._iconActor.destroy();
            this._iconActor = null;
            this._iconName = null;
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
});
