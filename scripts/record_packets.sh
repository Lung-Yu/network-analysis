#!/bin/bash

# ==============================================================================
# 互動式網路封包錄製腳本
#
# 功能:
#   - 自動偵測並列出所有可用的網路介面。
#   - 提示使用者選擇要監聽的介面。
#   - 讓使用者自訂儲存的檔名。
#   - 使用 tcpdump 進行錄製。
#
# 使用方式:
#   1. 將此腳本放在專案的 scripts 目錄中。
#   2. 開啟終端機，進入 scripts 目錄。
#   3. 執行 `sudo bash ./record_packets.sh`。
#
# 注意:
#   - 此腳本需要 root (sudo) 權限才能擷取網路封包。
#   - 請確保系統已安裝 tcpdump (macOS 和多數 Linux 發行版內建)。
# ==============================================================================

# 檢查是否以 root 權限執行
if [ "$EUID" -ne 0 ]; then
  echo "錯誤：此腳本需要 root 權限來擷取網路封包。"
  echo "請使用 sudo 執行：sudo bash ./record_packets.sh"
  exit 1
fi

echo "正在偵測可用的網路介面..."
echo "----------------------------------------"

# 使用 tcpdump -D 列出所有介面，並用 nl 加上行號
interfaces=$(tcpdump -D)
echo "$interfaces" | nl
echo "----------------------------------------"

# 提示使用者選擇介面
read -p "請輸入您想監聽的介面編號 (例如: 1): " interface_num

# 根據使用者輸入的編號，取得對應的介面名稱
# sed -n "${interface_num}p" 會印出選擇的行
# awk '{print $1}' 會抓取該行的第一個欄位 (介面名稱)
selected_interface=$(echo "$interfaces" | sed -n "${interface_num}p" | awk '{print $1}')

# 驗證選擇是否有效
if [ -z "$selected_interface" ]; then
    echo "錯誤：無效的選擇。請重新執行腳本並輸入正確的編號。"
    exit 1
fi

echo "您選擇了介面: $selected_interface"
echo ""

# 提示使用者輸入檔名，並提供預設值
default_filename="capture_$(date +%Y%m%d_%H%M%S).pcap"
read -p "請輸入儲存封包的檔案名稱 (預設: $default_filename): " output_file

# 如果使用者沒有輸入，則使用預設檔名
if [ -z "$output_file" ]; then
    output_file="$default_filename"
fi

# 確保檔名以 .pcap 結尾
if [[ ! "$output_file" == *.pcap ]]; then
    output_file="${output_file}.pcap"
fi

echo ""
echo "----------------------------------------"
echo "即將開始錄製封包..."
echo "  - 監聽介面: $selected_interface"
echo "  - 儲存至:   $(pwd)/$output_file"
echo ""
echo ">>> 按下 Ctrl+C 即可停止錄製 <<<"
echo "----------------------------------------"

# 執行 tcpdump 指令
# -i: 指定監聽的介面
# -w: 將原始封包寫入檔案
tcpdump -i "$selected_interface" -w "$output_file"

echo ""
echo "----------------------------------------"
echo "錄製已停止。"
echo "封包檔案已儲存於: $(pwd)/$output_file"
echo "----------------------------------------"
