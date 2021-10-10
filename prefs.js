imports.gi.versions['Gtk'] = '4.0';
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;

var settings;
var settings_bool;

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.kimpanel';

function init() {
    ExtensionUtils.initTranslations();
    settings = ExtensionUtils.getSettings();
    settings_bool = {
        vertical : {label : _("Vertical List")},
    };
}

function createBoolSetting(setting) {

    let hbox = new Gtk.Box({orientation : Gtk.Orientation.HORIZONTAL});

    let setting_label = new Gtk.Label({
        label : settings_bool[setting].label,
        xalign : 0,
        halign : Gtk.Align.FILL,
        hexpand : true
    });

    let setting_switch =
        new Gtk.Switch({active : settings.get_boolean(setting)});
    setting_switch.connect(
        'notify::active',
        function(button) { settings.set_boolean(setting, button.active); });

    hbox.append(setting_label);
    hbox.append(setting_switch);

    return hbox;
}

function createFontSelection() {
    let hbox = new Gtk.Box({orientation : Gtk.Orientation.HORIZONTAL});

    let setting_label = new Gtk.Label({
        label : _("Font"),
        xalign : 0,
        halign : Gtk.Align.FILL,
        hexpand : true
    });

    let font = settings.get_string('font') || "Sans 12";

    let button = new Gtk.FontButton({font : font});

    button.connect(
        "font-set",
        function(button) { settings.set_string('font', button.font); });

    hbox.append(setting_label);
    hbox.append(button);

    return hbox;
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({orientation : Gtk.Orientation.VERTICAL});
    let vbox = new Gtk.Box({
        orientation : Gtk.Orientation.VERTICAL,
        margin_top : 10,
        margin_start : 20,
        margin_end : 20
    });

    for (let setting in settings_bool) {
        vbox.append(createBoolSetting(setting));
    }
    vbox.append(createFontSelection());

    frame.append(vbox);
    frame.show();
    return frame;
}
