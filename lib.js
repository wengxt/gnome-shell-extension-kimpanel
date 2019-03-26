const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Params = imports.misc.params;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Pango = imports.gi.Pango;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const convenience = Me.imports.convenience;

const KimMenuItem = class extends PopupMenu.PopupBaseMenuItem {
    constructor(text, iconName, params) {
        super(params);

        this.label = new St.Label({ text: text });
        this.actor.add_child(this.label);
        this.actor.label_actor = this.label
        this._icon = new St.Icon({ x_align: St.Align.END, style_class: 'popup-menu-icon' });
        this.actor.add_child(this._icon);

        this.setIcon(iconName);
    }

    setIcon(name) {
        this._icon.gicon = createIcon(name);
    }
};

function parseProperty(str) {
    var p = str.split(":");
    var property = {
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

    if (name[0] == '/') {
        return Gio.FileIcon.new(Gio.File.new_for_path(name));
    }
    // this is to hack through the gtk silly icon theme code.
    // gtk doesn't want to mix symbolic icon and normal icon together,
    // while in our case, it's much better to show an icon instead of
    // hide everything.
    return Gio.ThemedIcon.new_with_default_fallbacks(name + '-symbolic-hack');
}

function createMenuItem(property) {
    var item = new KimMenuItem("","");
    item._key = property.key;
    return item;
}

function getTextStyle(settings) {
    var font_string = settings.get_string('font') || "Sans 11";
    var desc = Pango.FontDescription.from_string(font_string);

    var font_family = desc.get_family();
    var font_size = (desc.get_size()/Pango.SCALE)+"pt";
    var font_style;
    var i;
    for( i in Pango.Style )
        if( Pango.Style[i] == desc.get_style() )
            font_style = i.toLowerCase();

    var font_weight = desc.get_weight();

    return "font-family:"+font_family+";font-size:"+font_size+";font-style:" 
    +font_style+";font-weight:"+font_weight;
}

function isLookupTableVertical(settings) {
    return settings.get_boolean('vertical') || false ;
}

function extractLabelString(l) {
    if (l.length >= 2 && l.charCodeAt(0) < 127 && l.charCodeAt(1) < 127) {
        return l.substring(0, 2);
    } else {
        return l.substring(0, 1);
    }
}
