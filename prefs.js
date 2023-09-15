const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('gnome-shell-extensions-kimpanel');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.kimpanel';

function init() {
    ExtensionUtils.initTranslations();
}

function createBoolSetting(settings) {
    let hbox = new Gtk.Box({orientation : Gtk.Orientation.HORIZONTAL});

    let setting_label = new Gtk.Label({
        label : _("Vertical List"),
        xalign : 0,
        halign : Gtk.Align.FILL,
        hexpand : true
    });

    let setting_switch =
        new Gtk.Switch({active : settings.get_boolean('vertical')});
    setting_switch.connect(
        'notify::active',
        function(button) { settings.set_boolean('vertical', button.active); });

    hbox.append(setting_label);
    hbox.append(setting_switch);

    return hbox;
}

function createFontSelection(settings) {
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

    let settings = ExtensionUtils.getSettings();
    vbox.append(createBoolSetting(settings));
    vbox.append(createFontSelection(settings));

    frame.append(vbox);
    frame.show();
    return frame;
}
