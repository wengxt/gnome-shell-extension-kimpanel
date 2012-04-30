const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;

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

function createMenuItem(property) {
    let item = new PopupMenu.PopupImageMenuItem("","");

    if (property['icon'] != '') {
        let _icon = new St.Icon({
            icon_name: property['icon'],
            icon_type: St.IconType.FULLCOLOR,
            style_class: 'popup-menu-icon'
        });
        item._icon = _icon;
        item.addActor(item._icon);
    }
    item._key = property.key;
    return item;
}
