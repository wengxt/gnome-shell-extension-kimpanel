set(POT_FILE
    gnome-shell-extensions-kimpanel.pot
)

file(GLOB PO_FILES
    *.po
)

# Update .po files and compile them to binary .gmo files
gettext_create_translations(${POT_FILE} ALL ${PO_FILES})