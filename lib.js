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

function initTranslations(extension) {
    let localeDir = extension.dir.get_child('locale').get_path();

    // Extension installed in .local
    if (GLib.file_test(localeDir, GLib.FileTest.EXISTS)) {
        Gettext.bindtextdomain('gnome-shell-extensions-kimpanel', localeDir);
    }
    // Extension installed system-wide
    else {
        Gettext.bindtextdomain('gnome-shell-extensions-kimpanel', extension.metadata.locale);
    }
}

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

    params = Params.parse(params, {style_class: 'kim-popup-menu-icon', icon_type: St.IconType.FULLCOLOR});
    if (name[0] == '/') {
        let iconBox = new St.Bin({ style_class: params.style_class });
        iconBox.child = Clutter.Texture.new_from_file(name);
        return iconBox;
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
