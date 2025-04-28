#!/bin/bash

# 定义 dconf 路径
dconf_path="/org/gnome/shell/extensions/kimpanel/panel-hide"

# 读取当前值
current_value=$(dconf read "$dconf_path")

# 判断当前值并翻转
if [[ "$current_value" == "true" ]]; then
  new_value="false"
elif [[ "$current_value" == "false" ]]; then
  new_value="true"
else
  echo "错误：无法识别的当前值 '$current_value'"
  exit 1
fi

# 写入新的值
dconf write "$dconf_path" "$new_value"

echo "已将 '$dconf_path' 的值从 '$current_value' 切换为 '$new_value'"

exit 0