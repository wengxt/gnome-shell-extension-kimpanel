#!/bin/bash

if [ $UID -eq 0 ];then
	DEST="/usr/share/gnome-shell/extensions/kimpanel@fcitx.org"
else
	DEST=$HOME/.local/share/gnome-shell/extensions/kimpanel@fcitx.org/
fi
mkdir -p $DEST
cp extension.js $DEST
cp metadata.json $DEST
cp stylesheet.css $DEST
