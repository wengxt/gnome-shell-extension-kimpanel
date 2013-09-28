const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Params = imports.misc.params;
const Shell = imports.gi.Shell;
const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;
const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

const KimIndicator = new Lang.Class({
    Name: "KimIndicator",
    Extends: PanelMenu.Button,

    _init: function(params){
        this.parent(0.0, 'kimpanel');
        params = Params.parse(params, {kimpanel: null});
        this._properties = {};
        this._propertySwitch = {};

        this._box = new St.BoxLayout({ style_class: 'panel-status-button-box' });
        this.actor.add_actor(this._box);
        this._setIcon('input-keyboard-symbolic');

        this.kimpanel = params.kimpanel;

        this._setting = new PopupMenu.PopupMenuItem(_("IM Settings"));
        this._setting.connect('activate', Lang.bind(this, function(){
            this.kimpanel.emit('Configure');
        }));
        this._reload = new PopupMenu.PopupMenuItem(_("Reload Configuration"));
        this._reload.connect('activate', Lang.bind(this, function(){
            this.kimpanel.emit('ReloadConfig');
        }));


        let _appSys = Shell.AppSystem.get_default();
        let _gsmPrefs = _appSys.lookup_app('gnome-shell-extension-prefs.desktop');
        let item;

        this._prefs = new PopupMenu.PopupMenuItem(_("Panel Preferences"));
        this._prefs.connect('activate', function () {
            if (_gsmPrefs.get_state() == _gsmPrefs.SHELL_APP_STATE_RUNNING){
                _gsmPrefs.activate();
            } else {
                _gsmPrefs.launch(global.display.get_current_time_roundtrip(),
                                 [Me.metadata.uuid],-1,null);
            }
        });

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._reload);
        this.menu.addMenuItem(this._setting);
        this.menu.addMenuItem(this._prefs);
        this.actor.hide();
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
            this.menu.addMenuItem( this._propertySwitch[key], this.menu.numMenuItems - 4 );
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
            let key;
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
            let p;
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
            if (count > 0) {
                this.actor.show();
            } else {
                this.actor.hide();
            }
        }
    },

    _setIcon: function(iconName) {
        let gicon = Lib.createIcon(iconName);
        if (this.mainIcon) {
           this.mainIcon.gicon = gicon;
        } else {
            let icon = new St.Icon({ gicon: gicon,
                                     style_class: 'system-status-icon' });
            this._box.add_actor(icon);
            this.mainIcon = icon;
        }
    },

    _active: function(){
         this._setIcon(this._properties['/Fcitx/im'] ? this._properties['/Fcitx/im'].icon : 'input-keyboard');
    },

    _deactive: function(){
        this._setIcon('input-keyboard');
    }
});
