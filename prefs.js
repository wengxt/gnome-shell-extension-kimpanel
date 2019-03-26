const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

const ExtensionUtils = imports.misc.extensionUtils;

var settings;
var settings_bool;
var settings_font;

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.kimpanel';

function init() {
    ExtensionUtils.initTranslations();
    settings = ExtensionUtils.getSettings();
    settings_bool = { vertical:{ label:_("Vertical List")}, };
}

function setBehaviour(behaviour) {
    settings.set_string(SETTINGS_BEHAVIOUR_KEY, behaviour);
    settings.set_boolean(SETTINGS_FIRST_TIME_KEY, false);
}

function createBoolSetting(setting) {

    var hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

    var setting_label = new Gtk.Label({label: settings_bool[setting].label,
                                       xalign: 0 });

    var setting_switch = new Gtk.Switch({active: settings.get_boolean(setting)});
    setting_switch.connect('notify::active', function(button) {
        settings.set_boolean(setting, button.active);
    });

    hbox.pack_start(setting_label, true, true, 0);
    hbox.add(setting_switch);

    return hbox;
}

function createFontSelection() {
    var hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
    
    var setting_label = new Gtk.Label( { label: _("Font"), xalign: 0});


    var font = settings.get_string('font') || "Sans 12";

    var button = new Gtk.FontButton( { font_name:font } );

    button.connect("font-set", function(button){ 
        settings.set_string('font',button.get_font_name()); 
    });

    hbox.pack_start(setting_label, true, true, 0);
    hbox.add(button);

    return hbox;
}

function buildPrefsWidget() {
    var frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                              border_width: 10 });
    var vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                             margin: 20, margin_top:10 });

    var setting = null;
    for (setting in settings_bool) {
        var hbox = createBoolSetting(setting);
        vbox.add(hbox);
    }
    var hbox = createFontSelection();
    vbox.add(hbox);
    
    frame.add(vbox);
    frame.show_all();
    return frame;
}
