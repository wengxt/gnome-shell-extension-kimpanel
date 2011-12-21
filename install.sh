#!/bin/bash

extension_name="kimpanel@kde.org"

if [ $UID -eq 0 ];then
	DEST="/usr/share/gnome-shell/extensions/$extension_name"
else
	DEST=$HOME/.local/share/gnome-shell/extensions/$extension_name/
fi
mkdir -p $DEST || exit 1
cp extension.js metadata.json stylesheet.css "$DEST" || exit 1
echo "Install successfull!"
echo "Enable it with gnome-tweak-tool"
