# [Feature] 即時流量監控 (Real-Time Traffic Monitoring)

### 使用者故事 (User Story)
作為一名分析師，我希望能直接在系統中選擇一個網路介面進行即時監控，而不是只能上傳靜態的 PCAP 檔案，以便能即時發現威脅。

### 功能需求 (Acceptance Criteria)
- **後端**:
    - 提供一個 API 端點，用以列出伺服器上所有可用的網路介面。
    - 實作一個 WebSocket 端點，用於即時將 Suricata 產生的警報與流量數據推送到前端。
    - Suricata 需要能以 `-i <interface>` 模式啟動與管理。
- **前端**:
    - 新增「即時監控」頁面或模式。
    - 讓使用者可以從列表中選擇要監聽的網路介面。
    - 建立 WebSocket 連線，並即時更新網路圖與警報列表。

### 潛在挑戰
- 需要處理 `sudo` 權限問題，以允許應用程式監聽網路介面。
- WebSocket 的穩定性與效能管理。
