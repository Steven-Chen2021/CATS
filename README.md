# Carbon Activity Tracking System (CATS)

碳排活動資料蒐集平台 – Software Requirement Specification (SRS)

---

## 📖 簡介

CATS 提供全球分公司依 **ISO 14064** 框架蒐集、審核與彙整 Scope 1/2/3 活動數據，計算排放量並輸出清冊簡表與稽核佐證。  
支援 **多層級組織架構 (Tier1~Tier4)**，可進行資料追溯、版本控制與稽核。

---

## 🏗 技術架構

- **Frontend (UI)**  
  - Vue 3  
  - vue-pure-admin  
  - element-plus  
  - tailwindcss  
  - typescript  
  - pinia  
  - vite  
  - handsontable  
  - ag-grid-vue3  

- **Backend (API)**  
  - .NET 8.0 (ASP.NET Core)  

- **Database**
  - Microsoft SQL Server 2022

---

## 🚀 快速開始

CATS 包含 .NET 8 後端 API 與 Vue 3 前端。以下步驟說明如何在本機啟動系統：

### 1. 安裝先決條件
- [Node.js](https://nodejs.org/) 18+
- [.NET SDK 8.0](https://dotnet.microsoft.com/)
- SQL Server 2022 或相容版本

### 2. 啟動資料庫
啟動 SQL Server 並依 `database/` 目錄中的腳本建立必要資料表與資料庫設定。

### 3. 啟動後端 API
```bash
cd backend
dotnet restore
dotnet run
```
API 預設會在 `http://localhost:5000` 提供服務。

### 4. 啟動前端
```bash
cd frontend
npm install
npm run dev
```
瀏覽器開啟 `http://localhost:5173` 即可存取系統。

---

## 👥 使用者角色與權限 (RBAC)

- **Admin（總部）**  
  - 排放源類型與因子版本管理  
  - 系統設定、審核流程建議  
  - 年度資料鎖定/解鎖  

- **Division Admin（區域）**  
  - 區域品質稽核  
  - 年度資料鎖定/解鎖  

- **Site Data Owner**  
  - 據點排放源實例維護  
  - 活動數據蒐集、上傳、提交  

- **Data Reviewer L1 / L2**  
  - 審核、退回、備註  

- **Auditor（稽核）**  
  - 只讀、下載佐證、導出清冊  

- **ReadOnly**  
  - 查詢清冊、圖表檢視  

---

## 📊 功能模組

### 1. 系統參數管理
- 多層組織架構（Tier1 → Tier4）
- 排放源類型庫（固定燃燒、移動、逸散性、化糞池、電力、差旅、物流…）
- 排放因子與版本管理
- 排放源實例建立（含品牌/型號/容量等屬性）
- 據點與排放源綁定

### 2. 資料蒐集
- 手動輸入（表單驗證、Excel-like 輸入）
- API 串接（REST/JSON）
- 支援附件上傳（PDF、合約、照片）
- 狀態管理：Draft → Submitted → L1/L2 Approved → Completed → Locked
- 支援解鎖申請與稽核追蹤

### 3. 清冊輸出
- 依範疇/分站/類型/月份/年度彙整
- 顯示活動數據、排放量（CO₂e）、因子版本
- 鑽取明細（附件檢視）
- 導出：Excel / CSV / PDF

### 4. 系統通知
- 提交、退回、核准、年度鎖定/解鎖通知
- 待審逾期、退回未處理提醒

---

## 🧩 資料模型 – 固定式排放源 (範例)

### 活動層 (Activity Layer)

| 欄位名稱 | 範例 | 說明 | 必填 |
|----------|------|------|------|
| 公司名稱 | 中菲行 | 對應組織架構 | ✔ |
| 據點名稱 | 新竹辦事處 | Tier 4 分站/據點 | ✔ |
| 活動/設備名稱 | HONDA EU 3000is | 設備名稱 | ✔ |
| 設備編號 | 02-0062A | 公司內部管理編號 | ✔ |
| 設備類型 | 發電機 | 區分發電機、鍋爐 | ✔ |
| 燃料種類 | 95無鉛汽油 | 對應排放因子庫 | ✔ |
| 月份 | 1 | 活動數據所屬月份 | ✔ |
| 活動數據值 | 120.5 | 燃料消耗量 | ✔ |
| 單位 | L | 公升、m³、MJ | ✔ |
| 活動數據來源 | 發票/合約 | 支撐文件來源 | ✔ |
| 附件/佐證 | 發票.pdf | 上傳檔案 | ✔ |
| 備註 | 2024年測試使用 | 補充說明 | ✘ |

### 因子層 (Factor Layer)

- **EF_CO2**: 2.26313 (kgCO₂/L)  
- **EF_CH4**: 0.00010 (kgCH₄/L)  
- **EF_N2O**: 0.00002 (kgN₂O/L)  
- **GWP_CO2/CH4/N2O**: 1 / 28 / 265  
- **來源版本**: 管理表 6.0.4  

### 結果層 (Result Layer)

- **Emission_CO2** = 活動量 × EF_CO2 × GWP_CO2  
- **Emission_CH4** = 活動量 × EF_CH4 × GWP_CH4  
- **Emission_N2O** = 活動量 × EF_N2O × GWP_N2O  
- **Emission_Total_CO2e** = 三氣體總和 (kgCO₂e)  

---

## 🔒 非功能性需求

- **可用性**: 99.9%（工作時段）  
- **備份**: DB 每日備份，保留近七日  
- **效能**: 年度單據點 10 萬筆，查詢 ≤ 3 秒  
- **安全**:  
  - OWASP ASVS  
  - JWT / OIDC  
  - 欄位層級審計  
  - 附件防毒掃描  
- **合規**:  
  - ISO 14064 稽核追溯  
  - GDPR（人名去識別化選項）  

---

## 📂 資料夾結構（建議）

```
/frontend       # Vue3 + Tailwind + Element Plus
/backend        # .NET 8.0 Web API
/database       # SQL Server schema, migration scripts
/docs           # 規格書、ER 圖、流程圖
/tests          # 單元測試 & 整合測試
```

---

## 🚀 開發注意事項
1. **排放因子版本化管理**：必須支援 ValidFrom/ValidTo，並能回溯重算。  
2. **附件必填規範**：固定燃燒等活動需強制上傳佐證。  
3. **審核流程彈性**：支援「無審核 / 一階 / 二階」模式。  
4. **日誌稽核**：所有新增/修改/審核動作需完整紀錄。  

---

## 📌 待辦 (TODO)

- [ ] 建立 emission type library schema  
- [ ] 開發活動數據輸入模組  
- [ ] API endpoint 設計（含驗證/錯誤碼）  
- [ ] 清冊報表輸出模組  
- [ ] 系統通知服務  
- [ ] 審核流程引擎  
- [ ] 測試案例與 CI/CD pipeline  
