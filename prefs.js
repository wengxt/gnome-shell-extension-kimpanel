imports.gi.versions['Gtk'] = '4.0';
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
                                       xalign: 0, halign: Gtk.Align.FILL, hexpand: true });

    var setting_switch = new Gtk.Switch({active: settings.get_boolean(setting)});
    setting_switch.connect('notify::active', function(button) {
        settings.set_boolean(setting, button.active);
    });

    hbox.append(setting_label);
    hbox.append(setting_switch);

    return hbox;
}

function createFontSelection() {
    var hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

    var setting_label = new Gtk.Label( { label: _("Font"), xalign: 0, halign: Gtk.Align.FILL, hexpand: true});

    var font = settings.get_string('font') || "Sans 12";

    var button = new Gtk.FontButton( { font:font } );

    button.connect("font-set", function(button){
        settings.set_string('font',button.font);
    });

    hbox.append(setting_label);
    hbox.append(button);

    return hbox;
}

function buildPrefsWidget() {
    var frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    var vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_top: 10, margin_start: 20, margin_end: 20 });

    var setting = null;
    for (setting in settings_bool) {
        var hbox = createBoolSetting(setting);
        vbox.append(hbox);
    }
    var hbox = createFontSelection();
    vbox.append(hbox);

    frame.append(vbox);
    frame.show();
    return frame;
}
