# [Feature] 分析報告匯出 (Export Analysis Report)

### 使用者故事 (User Story)
作為一名分析師，我需要將我的分析發現製作成報告提交給主管或存檔，我希望能一鍵從系統中匯出格式化的報告，而不是手動截圖和複製貼上。

### 功能需求 (Acceptance Criteria)
- **後端**:
    - 建立一個新的 API 端點，例如 `/api/history/{record_id}/export?format=pdf`。
    - 接收請求後，從資料庫讀取指定的分析紀錄。
    - 使用一個函式庫 (如 `WeasyPrint` for PDF, `csv` module for CSV) 將數據格式化。
    - 將警報列表、分析摘要等資訊生成為 PDF 或 CSV 檔案並回傳給使用者。
- **前端**:
    - 在分析詳情頁面，新增一個「匯出報告」的按鈕。
    - 提供選項讓使用者選擇匯出的格式 (例如 PDF, CSV)。
    - 點擊後，觸發後端 API 並處理檔案下載。

### 潛在挑戰
- PDF 的排版與樣式設計，需要確保報告清晰且專業。
- 處理網路圖的匯出，可能需要將其儲存為圖片後再嵌入 PDF 中。
