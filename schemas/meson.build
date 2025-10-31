gnome = import('gnome')

install_data(f'@settings_schema@.gschema.xml', install_dir: schemadir)

gnome.post_install(glib_compile_schemas: get_option('glib_compile_schemas'))
