const St = imports.gi.St;
const GObject = imports.gi.GObject;
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

var KimIndicator = GObject.registerClass(
class Indicator_KimIndicator extends PanelMenu.Button {

    _init(params){
        super._init(0.0, 'kimpanel');
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
        this.add_actor(this._box);
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
            var _appSys = Shell.AppSystem.get_default();
            var _gsmPrefs = _appSys.lookup_app('gnome-shell-extension-prefs.desktop');
            var info = _gsmPrefs.get_app_info();
            var timestamp = global.display.get_current_time_roundtrip();
            info.launch_uris([Me.metadata.uuid], global.create_app_launch_context(timestamp, -1));
        });

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._reload);
        this.menu.addMenuItem(this._setting);
        this.menu.addMenuItem(this._prefs);
        this.hide();
    }

    _addPropertyItem(key) {
        if ( key in this._properties )
        {
            var property = this._properties[key];
            var item = Lib.createMenuItem(property);

            item.connect('activate', Lang.bind(this, function(){
                this.kimpanel.triggerProperty(item._key);
            }));
            item.setIcon(property.icon);
            item.label.text = property.label;

            this._propertySwitch[key] = item;
            this.menu.addMenuItem( this._propertySwitch[key], this.menu.numMenuItems - 4 );
        }
    }

    _updatePropertyItem(key) {
        var property = this._properties[key];
        var item = this._propertySwitch[key]; 
        item.setIcon(property.icon);
        item.label.text = property.label;
        return;
    }

    _updateProperty(propstr) {
        var property = Lib.parseProperty(propstr);
        var key = property.key;
        this._properties[key] = property;
        this._updateProperties();
    }

    _updateProperties( properties ) {
        if( properties == undefined )
        {
            var key;
            for ( key in this._propertySwitch )
            {
                var property = this._properties[key];
                var item = this._propertySwitch[key]; 
                item.setIcon(property.icon);
                item.label.text = property.label;
            }
            return;
        } else {
            var p;
            for (p in this._propertySwitch) {
                if (properties[p] == undefined) {
                    this._propertySwitch[p].destroy();
                    delete this._propertySwitch[p];
                }
            }

            var count = 0;
            for( p in properties) {
                count ++;
                var property = Lib.parseProperty( properties[p] );
                var key = property.key;
                this._properties[key] = property;
                if( key in this._propertySwitch )
                    this._updatePropertyItem(key);
                else
                    this._addPropertyItem(key);
            }
            if (count > 0) {
                this.show();
            } else {
                this.hide();
            }
        }
    }

    _setIcon(iconName, labelName) {
        if (iconName === '') {
            this.labelIcon.text = Lib.extractLabelString(labelName);
            this.mainIcon.visible = false
            this.labelIcon.visible = true
        } else {
            var gicon = Lib.createIcon(iconName);
            this.mainIcon.gicon = gicon;
            this.mainIcon.visible = true
            this.labelIcon.visible = false
        }
    }

    _active(){
         if (this._properties['/Fcitx/im']) {
             this._setIcon(this._properties['/Fcitx/im'].icon, this._properties['/Fcitx/im'].label);
         } else {
             this._setIcon('input-keyboard', '');
         }
    }

    _deactive(){
        this._setIcon('input-keyboard', '');
    }
});
