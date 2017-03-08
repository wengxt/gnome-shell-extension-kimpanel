const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

const Me = imports.misc.extensionUtils.getCurrentExtension();
const convenience = Me.imports.convenience;

let settings;
let settings_bool;
let settings_font;

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.kimpanel';

function init() {
    convenience.initTranslations();
    settings = convenience.getSettings();
    settings_bool = { vertical:{ label:_("Vertical List")}, };
}

function setBehaviour(behaviour) {
    settings.set_string(SETTINGS_BEHAVIOUR_KEY, behaviour);
    settings.set_boolean(SETTINGS_FIRST_TIME_KEY, false);
}

function createBoolSetting(setting) {

    let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

    let setting_label = new Gtk.Label({label: settings_bool[setting].label,
                                       xalign: 0 });

    let setting_switch = new Gtk.Switch({active: settings.get_boolean(setting)});
    setting_switch.connect('notify::active', function(button) {
        settings.set_boolean(setting, button.active);
    });

    hbox.pack_start(setting_label, true, true, 0);
    hbox.add(setting_switch);

    return hbox;
}

function createFontSelection() {
    let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
    
    let setting_label = new Gtk.Label( { label: _("Font"), xalign: 0});


    let font = settings.get_string('font') || "Sans 12";

    let button = new Gtk.FontButton( { font_name:font } );

    button.connect("font-set", function(button){ 
        settings.set_string('font',button.get_font_name()); 
    });

    hbox.pack_start(setting_label, true, true, 0);
    hbox.add(button);

    return hbox;
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                              border_width: 10 });
    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                             margin: 20, margin_top:10 });

    let setting = null;
    for (setting in settings_bool) {
        let hbox = createBoolSetting(setting);
        vbox.add(hbox);
    }
    let hbox = createFontSelection();
    vbox.add(hbox);
    
    frame.add(vbox);
    frame.show_all();
    return frame;
}
