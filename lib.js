const PopupMenu = imports.ui.popupMenu;
const {St, GObject, Gio, Pango} = imports.gi;
const Params = imports.misc.params;

var KimMenuItem = GObject.registerClass(
class KimMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(text, iconName, params) {
        super._init(params);

        this.label = new St.Label({ text: text });
        this._icon = new St.Icon({ x_align: St.Align.END, style_class: 'popup-menu-icon' });
        this.add_child(this._icon);
        this.add_child(this.label);

        this.setIcon(iconName);
    }

    setIcon(name) {
        this._icon.gicon = createIcon(name);
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
    if (p.length > 4 && p[4].length > 0) {
        property.hint = p[4].split(',');
    } else {
        property.hint = [];
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
