#!/bin/sh

BASEDIR=".." # root of translatable sources
PROJECT="gnome-shell-extensions-kimpanel" # project name
BUGADDR="fcitx-dev@googlegroups.com" # MSGID-Bugs
WDIR="`pwd`" # working dir

# see above on sorting

find "${BASEDIR}" -name '*.js' | sort > "${WDIR}/infiles.list"

xgettext --from-code=UTF-8 -C  -k_ --msgid-bugs-address="${BUGADDR}" --files-from=infiles.list \
    -D "${BASEDIR}" -D "${WDIR}" -o "${PROJECT}.pot" || \
    { echo "error while calling xgettext. aborting."; exit 1; }
echo "Done extracting messages"

echo "Merging translations"
catalogs=`find . -name '*.po'`
for cat in $catalogs; do
    echo "$cat"
    msgmerge -o "$cat.new" "$cat" "${WDIR}/${PROJECT}.pot"
    mv "$cat.new" "$cat"
done

echo "Done merging translations"
echo "Cleaning up"
rm "${WDIR}/infiles.list"
echo "Done"
