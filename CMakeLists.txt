cmake_minimum_required(VERSION 2.6)

project(kimpanel-for-gnome-shell NONE)

find_package(Gettext REQUIRED)
find_program(ZIP zip)
find_program(UNZIP unzip)

if (NOT ZIP)
    message(FATAL_ERROR "zip not found")
endif (NOT ZIP)
if (NOT UNZIP)
    message(FATAL_ERROR "unzip not found")
endif (NOT UNZIP)

add_subdirectory(po)

set(uuid "kimpanel@kde.org")
set(datadir "${CMAKE_INSTALL_PREFIX}/share")
set(topextensiondir "${datadir}/gnome-shell/extensions")
set(extensiondir "${topextensiondir}/${uuid}")
set(localextensiondir "$ENV{HOME}/.local/share/gnome-shell/extensions/${uuid}")
set(localedir "${datadir}/locale")

configure_file(${CMAKE_CURRENT_SOURCE_DIR}/metadata.json.in ${CMAKE_CURRENT_BINARY_DIR}/metadata.json @ONLY)

set(extension_FILES
    extension.js
    indicator.js
    panel.js
    menu.js
    lib.js
    prefs.js
    ${CMAKE_CURRENT_BINARY_DIR}/metadata.json
    stylesheet.css
)

set(schema_FILES
    schemas/org.gnome.shell.extensions.kimpanel.gschema.xml
    schemas/gschemas.compiled
    )

install(FILES ${extension_FILES} DESTINATION ${extensiondir})
install(FILES ${schema_FILES} DESTINATION ${extensiondir}/schemas)

add_custom_command(OUTPUT "${uuid}.zip"
    DEPENDS ${extension_FILES} ${schema_FILES}
    COMMAND ${CMAKE_COMMAND} -E remove_directory "${CMAKE_CURRENT_BINARY_DIR}/_build"
    COMMAND ${CMAKE_COMMAND} -E make_directory "${CMAKE_CURRENT_BINARY_DIR}/_build"
    COMMAND ${CMAKE_MAKE_PROGRAM} install DESTDIR="${CMAKE_CURRENT_BINARY_DIR}/_build"
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${CMAKE_CURRENT_BINARY_DIR}/_build/${extensiondir}" "${CMAKE_CURRENT_BINARY_DIR}/_build/${uuid}/"
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${CMAKE_CURRENT_BINARY_DIR}/_build/${datadir}/locale" "${CMAKE_CURRENT_BINARY_DIR}/_build/${uuid}/locale"
    COMMAND cd "${CMAKE_CURRENT_BINARY_DIR}/_build/${uuid}" && ${ZIP} -qr "${CMAKE_CURRENT_BINARY_DIR}/${uuid}.zip" .
)

add_custom_target(build-zip
    DEPENDS ${uuid}.zip
)

add_custom_target(install-zip
    DEPENDS ${uuid}.zip
    COMMAND ${CMAKE_COMMAND} -E make_directory "${localextensiondir}"
    COMMAND ${UNZIP} -o "${CMAKE_CURRENT_BINARY_DIR}/${uuid}.zip" -d "${localextensiondir}"
)

add_custom_target(uninstall-zip
    COMMAND ${CMAKE_COMMAND} -E remove_directory "${localextensiondir}"
)
