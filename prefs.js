import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.kimpanel';

class KimpanelPrefsWidget extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }

    constructor(settings) {
        super();
        this._settings = settings;

        const miscGroup = new Adw.PreferencesGroup();
        this.add(miscGroup);

        let toggle = new Gtk.Switch({
            action_name: 'kimpanel.vertical-list',
            valign: Gtk.Align.CENTER,
        });
        let row = new Adw.ActionRow({
            title: _('Vertical List'),
            activatable_widget: toggle,
        });
        this._settings.bind('vertical', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        row.add_suffix(toggle);
        miscGroup.add(row);

        let button = new Gtk.FontButton();
        button.set_valign(Gtk.Align.CENTER);
        row = new Adw.ActionRow({
            title: _('Font'),
            activatable_widget: button,
        });
        this._settings.bind('font', button, 'font', Gio.SettingsBindFlags.DEFAULT);
        row.add_suffix(button);
        miscGroup.add(row);
    }
}


export default class KimpanelExtensionPreferences extends ExtensionPreferences {
    getPreferencesWidget() {
        return new KimpanelPrefsWidget(this.getSettings());
    }
}
