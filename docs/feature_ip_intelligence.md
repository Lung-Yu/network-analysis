# [Feature] IP 地理位置與威脅情資整合 (IP Geo & Threat Intelligence)

### 使用者故事 (User Story)
作為一名分析師，當我看到一個可疑的 IP 位址時，我希望能立即知道它的地理來源以及它是否被標記為惡意 IP，以幫助我快速判斷威脅的嚴重性。

### 功能需求 (Acceptance Criteria)
- **後端**:
    - 在 `parse_eve_json` 函式中新增邏輯。
    - 對於日誌中出現的每個外部 IP，使用第三方服務或本地資料庫 (如 MaxMind GeoLite2, AbuseIPDB API) 查詢其地理位置與威脅分數。
    - 將這些額外資訊（國家、城市、ISP、威脅分數）加入到 API 回應的 `nodes` 和 `alerts` 物件中。
- **前端**:
    - 在網路圖的節點上，透過 tooltip 或側邊欄顯示 IP 的地理位置與威脅情資。
    - 在警報列表中，為來源/目的 IP 加上國旗圖示或顏色標記，以突顯來自高風險地區或已知惡意來源的流量。

### 潛在挑戰
- API 金鑰的管理與安全性。
- 免費 API 的使用頻率限制。
- 本地資料庫 (GeoLite2) 的定期更新機制。
