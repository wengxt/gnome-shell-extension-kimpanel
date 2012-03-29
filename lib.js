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