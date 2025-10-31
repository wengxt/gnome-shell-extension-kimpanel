project(
    'gnome-shell-extensions-kimpanel',
    version: '90',
    meson_version: '>=0.58',
    license: 'GPL-2.0-or-later',
)

gettext_domain = 'gnome-shell-extensions-kimpanel'
settings_schema = 'org.gnome.shell.extensions.kimpanel'
uuid = 'kimpanel@kde.org'
version = meson.project_version().to_int()

datadir = get_option('datadir')
extdir = datadir / 'gnome-shell' / 'extensions' / uuid
schemadir = datadir / 'glib-2.0' / 'schemas'

configure_file(
    configuration: {
        'GETTEXT_DOMAIN': gettext_domain,
        'SETTINGS_SCHEMA': settings_schema,
        'UUID': uuid,
        'VERSION': version,
    },
    input: 'metadata.json.meson.in',
    output: 'metadata.json',
    install: true,
    install_dir: extdir,
)

install_data(
    'extension.js',
    'indicator.js',
    'lib.js',
    'menu.js',
    'panel.js',
    'prefs.js',
    'stylesheet.css',
    install_dir: extdir,
)

subdir('schemas')
subdir('po')
