#!/bin/bash

function error()
{
    echo "Install failed!"
    exit 1;
}

rm -rf build
mkdir build
cd build
CMAKE=`which cmake`

if [ ! -x $CMAKE ]; then
    echo "cmake not found";
    exit 1;
fi

cmake .. || error
make clean || error
make install-zip || error

echo "Install successfull!"
echo "Enable it with gnome-tweak-tool or gnome-tweaks"
