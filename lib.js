const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Params = imports.misc.params;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const Lang = imports.lang;

const KimMenuItem = new Lang.Class({
    Name: 'KimMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function (text, iconName, params) {
        this.parent(params);

        this.label = new St.Label({ text: text });
        this.addActor(this.label);
        this._icon = null;

        this.setIcon(iconName);
    },

    setIcon: function(name) {
        if (this._icon) {
            this.removeActor(this._icon);
            this._icon.destroy();
        }
        this._icon = createIcon(name);
        if (this._icon)
            this.addActor(this._icon, { align: St.Align.END });
    }
});

const KimIcon = new Lang.Class({
    Name: 'KimIcon',
    Extends: St.Bin,

    _init: function(name, params) {
        this.parent(params);
        this.child = Clutter.Texture.new_from_file(name);
        this.connect("style-changed", Lang.bind(this, this._style_changed));
    },

    _style_changed: function() {
        let size = (0.5 + this.get_theme_node().get_length("icon-size"));
        this.child.width = size;
        this.child.height = size;
    }
});

function parseProperty(str) {
    let p = str.split(":");
    let property = {
        'key': p[0],
        'label': p[1],
        'icon': p[2],
        'text': p[3]
    }
    return property;
}

function createIcon(name, params) {
    if (!name)
        return null;

    params = Params.parse(params, {style_class: 'popup-menu-icon', icon_type: St.IconType.FULLCOLOR});
    if (name[0] == '/') {
        return new KimIcon(name, {style_class: params.style_class});
    }
    else {
        return new St.Icon({
            icon_name: name,
            icon_type: params.icon_type,
            style_class: params.style_class
        });
    }
}

function createMenuItem(property) {
    let item = new KimMenuItem("","");
    item._key = property.key;
    return item;
}
