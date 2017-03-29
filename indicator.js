const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Params = imports.misc.params;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;
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

        this._box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        this.labelIcon = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
        this.mainIcon = new St.Icon({ gicon: Lib.createIcon('input-keyboard'),
                                 style_class: 'system-status-icon' });
        this._box.add_child(this.labelIcon);
        this._box.add_child(this.mainIcon);
        this._box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
        this.actor.add_actor(this._box);
        this._setIcon('input-keyboard', '');

        this.kimpanel = params.kimpanel;

        this._setting = new PopupMenu.PopupMenuItem(_("IM Settings"));
        this._setting.connect('activate', Lang.bind(this, function(){
            this.kimpanel.emit('Configure');
        }));
        this._reload = new PopupMenu.PopupMenuItem(_("Reload Configuration"));
        this._reload.connect('activate', Lang.bind(this, function(){
            this.kimpanel.emit('ReloadConfig');
        }));

        this._prefs = new PopupMenu.PopupMenuItem(_("Panel Preferences"));
        this._prefs.connect('activate', function () {
            let _appSys = Shell.AppSystem.get_default();
            let _gsmPrefs = _appSys.lookup_app('gnome-shell-extension-prefs.desktop');
            let info = _gsmPrefs.get_app_info();
            let timestamp = global.display.get_current_time_roundtrip();
            info.launch_uris([Me.metadata.uuid], global.create_app_launch_context(timestamp, -1));
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
            let p;
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
            if (count > 0) {
                this.actor.show();
            } else {
                this.actor.hide();
            }
        }
    },

    _setIcon: function(iconName, labelName) {
        if (iconName === '') {
            this.labelIcon.text = Lib.extractLabelString(labelName);
            this.mainIcon.visible = false
            this.labelIcon.visible = true
        } else {
            let gicon = Lib.createIcon(iconName);
            this.mainIcon.gicon = gicon;
            this.mainIcon.visible = true
            this.labelIcon.visible = false
        }
    },

    _active: function(){
         if (this._properties['/Fcitx/im']) {
             this._setIcon(this._properties['/Fcitx/im'].icon, this._properties['/Fcitx/im'].label);
         } else {
             this._setIcon('input-keyboard', '');
         }
    },

    _deactive: function(){
        this._setIcon('input-keyboard', '');
    }
});
