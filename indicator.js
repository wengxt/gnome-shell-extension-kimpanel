const {St, GObject, Clutter, Pango} = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Params = imports.misc.params;
const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Me.imports.lib;

var KimIndicator = GObject.registerClass(
    class Indicator_KimIndicator extends PanelMenu.Button {
        _init(params) {
            super._init(0.0, 'kimpanel');
            params = Params.parse(params, {kimpanel : null});
            this._properties = {};
            this._propertySwitch = {};

            let hbox =
                new St.BoxLayout({style_class : 'panel-status-menu-box'});
            this.labelIcon =
                new St.Label({y_align : Clutter.ActorAlign.CENTER});
            this.labelIcon.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            this.labelIcon.clutter_text.line_wrap = false;
            this.mainIcon = new St.Icon({
                gicon : Lib.createIcon('input-keyboard'),
                style_class : 'system-status-icon'
            });
            hbox.add_child(this.labelIcon);
            hbox.add_child(this.mainIcon);
            this.add_actor(hbox);
            this._deactive();

            this.kimpanel = params.kimpanel;

            this._setting = new PopupMenu.PopupMenuItem(_("Settings"));
            this._setting.connect('activate',
                                  () => this.kimpanel.emit('Configure'));
            this._reload =
                new PopupMenu.PopupMenuItem(_("Reload Configuration"));
            this._reload.connect('activate',
                                 () => this.kimpanel.emit('ReloadConfig'));

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(this._reload);
            this.menu.addMenuItem(this._setting);
            this.hide();
        }

        _addPropertyItem(key) {
            if (!(key in this._properties)) {
                return;
            }
            let property = this._properties[key];
            let item = Lib.createMenuItem(property);

            item.connect('activate',
                         () => this.kimpanel.triggerProperty(item._key));
            item.setIcon(property.icon);
            item.label.text = property.label;

            this._propertySwitch[key] = item;
            this.menu.addMenuItem(this._propertySwitch[key],
                                  this.menu.numMenuItems - 3);
        }

        _updatePropertyItem(key) {
            let property = this._properties[key];
            let item = this._propertySwitch[key];
            item.setIcon(property.icon);
            item.label.text = property.label;
        }

        _updateProperty(propstr) {
            let property = Lib.parseProperty(propstr);
            if (property == null) {
                return;
            }
            let key = property.key;
            this._properties[key] = property;
            this._updateProperties();
        }

        _updateProperties(properties) {
            if (properties == undefined) {
                for (let key in this._propertySwitch) {
                    let property = this._properties[key];
                    let item = this._propertySwitch[key];
                    item.setIcon(property.icon);
                    item.label.text = property.label;
                }
                return;
            } else {
                for (let p in this._propertySwitch) {
                    if (properties[p] == undefined) {
                        this._propertySwitch[p].destroy();
                        delete this._propertySwitch[p];
                    }
                }

                let count = 0;
                for (let p in properties) {
                    let property = Lib.parseProperty(properties[p]);
                    if (property == null) {
                        continue;
                    }
                    count++;
                    let key = property.key;
                    this._properties[key] = property;
                    if (key in this._propertySwitch)
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

        _setIcon(property) {
            for (let i = 0; i < property.hint.length; i++) {
                if (property.hint[i].startsWith("label=")) {
                    let label = property.hint[i].substr(6);
                    if (label.length > 0) {
                        this.labelIcon.text = Lib.extractLabelString(label);
                        this.mainIcon.visible = false;
                        this.labelIcon.visible = true;
                        return;
                    }
                }
            }

            let iconName = property.icon;
            let labelName = property.label;

            if (iconName === '') {
                this.labelIcon.text = Lib.extractLabelString(labelName);
                this.mainIcon.visible = false;
                this.labelIcon.visible = true;
            } else {
                let gicon = Lib.createIcon(iconName);
                this.mainIcon.gicon = gicon;
                this.mainIcon.visible = true;
                this.labelIcon.visible = false;
            }
        }

        _active() {
            if (this._properties['/Fcitx/im']) {
                this._setIcon(this._properties['/Fcitx/im']);
            } else {
                self._deactive()
            }
        }

        _deactive() {
            let property = {
                'icon' : 'input-keyboard',
                'label' : '',
                'text' : '',
                'key' : '',
                'hint' : [],
            };

            this._setIcon(property);
        }
    });
