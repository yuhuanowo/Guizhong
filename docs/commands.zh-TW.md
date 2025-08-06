# 歸終命令文檔（繁體中文版）

本文檔詳細列出了歸終Discord機器人支持的所有命令，按功能分類組織，並提供了每個命令的用法和示例。

## 目錄
- [音樂命令](#音樂命令)
- [AI和聊天命令](#ai和聊天命令)
- [抽獎系統命令](#抽獎系統命令)
- [簽到系統命令](#簽到系統命令)
- [通用命令](#通用命令)
- [管理命令](#管理命令)
- [高級用法](#高級用法)

## 音樂命令

### 基本播放控制

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/play` | 播放音樂 | `/play [歌曲名稱或URL]` | `/play 周杰倫 稻香` |
| `/pause` | 暫停當前播放 | `/pause` | `/pause` |
| `/resume` | 恢復播放 | `/resume` | `/resume` |
| `/skip` | 跳過當前歌曲 | `/skip` | `/skip` |
| `/stop` | 停止播放並清空隊列 | `/stop` | `/stop` |
| `/volume` | 調整音量 | `/volume [1-100]` | `/volume 75` |
| `/nowplaying` | 顯示當前播放信息 | `/nowplaying` | `/nowplaying` |

### 隊列管理

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/queue` | 顯示播放隊列 | `/queue [頁碼]` | `/queue 2` |
| `/clear` | 清空播放隊列 | `/clear` | `/clear` |
| `/remove` | 移除特定歌曲 | `/remove [位置]` | `/remove 3` |
| `/shuffle` | 隨機打亂隊列 | `/shuffle` | `/shuffle` |
| `/loop` | 設置循環模式 | `/loop [off/song/queue]` | `/loop queue` |

### 音頻效果

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/filter` | 應用音頻濾鏡 | `/filter [濾鏡名稱]` | `/filter bassboost` |
| `/8d` | 應用8D音效 | `/8d` | `/8d` |
| `/bassboost` | 增強低音 | `/bassboost [級別]` | `/bassboost high` |
| `/nightcore` | 應用Nightcore效果 | `/nightcore` | `/nightcore` |
| `/vaporwave` | 應用Vaporwave效果 | `/vaporwave` | `/vaporwave` |
| `/resetfilters` | 重置所有音頻效果 | `/resetfilters` | `/resetfilters` |

### 其他音樂功能

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/lyrics` | 顯示當前歌曲歌詞 | `/lyrics [歌曲名(可選)]` | `/lyrics` |
| `/seek` | 跳到特定時間點 | `/seek [時間(秒)]` | `/seek 120` |
| `/playbili` | 播放嗶哩嗶哩視頻音頻 | `/playbili [視頻URL]` | `/playbili https://www.bilibili.com/video/BV...` |
| `/save` | 保存當前歌曲信息到私信 | `/save` | `/save` |

## AI和聊天命令

### 基礎聊天

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/agent` | 使用AI代理功能 | `/agent [text] [model] [history] [enable_search] [image] [audio] [file]` | `/agent text:請介紹一下中國的傳統節日 model:gpt-4o enable_search:true` |
| `/start` | 開啟連續AI聊天會話 | `/start [model] [enable_search] [title]` | `/start model:gpt-4.1-nano enable_search:true title:我的AI助手` |

## 抽獎系統命令

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/buy` | 購買彩票 | `/buy` | `/buy` |
| `/checkticket` | 查看你的彩票 | `/checkticket` | `/checkticket` |
| `/checkallticket` | 查看所有彩票 | `/checkallticket` | `/checkallticket` |
| `/delete` | 刪除特定彩票 | `/delete [彩票號碼]` | `/delete 12345` |
| `/deleteall` | 刪除所有彩票(管理員用) | `/deleteall` | `/deleteall` |
| `/draw` | 抽獎(管理員用) | `/draw` | `/draw` |

## 簽到系統命令

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/checkin` | 每日簽到獲取獎勵 | `/checkin` | `/checkin` |

## 通用命令

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/help` | 顯示幫助菜單 | `/help [分類(可選)]` | `/help music` |
| `/ping` | 檢查機器人延遲 | `/ping` | `/ping` |
| `/stats` | 顯示機器人統計信息 | `/stats` | `/stats` |
| `/botinfo` | 顯示機器人信息 | `/botinfo` | `/botinfo` |
<!-- | `/invite` | 獲取機器人邀請鏈接 | `/invite` | `/invite` |
| `/profile` | 查看個人資料 | `/profile [用戶(可選)]` | `/profile @用戶` | -->

## 管理命令

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/setdjonly` | 設置DJ專屬模式 | `/setdjonly [開/關]` | `/setdjonly on` |
| `/setdj` | 設置DJ角色 | `/setdj [@角色]` | `/setdj @DJ` |
| `/ban` | 禁止用戶 | `/ban [@用戶] [原因(可選)]` | `/ban @用戶 違反規則` |
| `/kick` | 踢出用戶 | `/kick [@用戶] [原因(可選)]` | `/kick @用戶` |
| `/purge` | 批量刪除消息 | `/purge [數量]` | `/purge 10` |
| `/announce` | 發送公告 | `/announce [內容]` | `/announce 服務器將在今晚維護` |

## 高級用法

### 命令組合示例

以下是一些組合命令的示例，展示如何更高效地使用歸終：

1. 播放歌曲、調整音量並應用音效：
   ```
   /play 周杰倫 七里香
   /volume 70
   /bassboost medium
   ```

2. 創建自定義播放列表：
   ```
   /play 周杰倫 稻香
   /play 林俊傑 江南
   /play 五月天 倔強
   /queue
   /save
   ```

3. AI對話連續互動：
   ```
   /agent text:請介紹一下中國的傳統節日 model:gpt-4o enable_search:true
   ```

4. 連續AI對話會話：
   ```
   # 開啟新的聊天會話
   /start model:gpt-4.1-nano enable_search:true title:學習助手
   
   # 在線程中直接發送消息進行對話
   你好，請幫我解釋一下量子物理
   
   # AI會自動回應並記住上下文
   # 繼續在同一線程中對話
   請給我一些學習資源
   
   # 使用控制按鈕管理會話
   # 點擊"結束會話"按鈕結束對話
   ```

5. 抽獎系統完整流程(管理員)：
   ```
   # 清空舊彩票
   /deleteall
   
   # 用戶購買新彩票
   # 等待足夠用戶參與
   
   # 進行抽獎
   /draw
   ```

### 連續AI聊天功能

歸終提供了連續AI聊天功能，讓您可以與AI進行長時間的對話而無需重複設定參數：

#### 使用方法
1. **開啟會話**：使用 `/start` 命令創建一個新的聊天線程
2. **持續對話**：直接在線程中發送消息，AI會自動回應
3. **上下文記憶**：AI會記住整個對話的上下文
4. **靈活控制**：使用按鈕控制搜索功能和會話狀態

#### 功能特點
- 🚀 **快速開始**：一鍵創建專屬聊天空間
- 💬 **連續對話**：無需重複設定，直接聊天
- 🧠 **記憶功能**：AI記住整個對話歷史
- 🔍 **搜索切換**：隨時開啟/關閉網絡搜索
- ⏰ **自動清理**：24小時後自動清理會話
- 🔒 **權限控制**：只有創建者可以控制會話

#### 支援功能
- 文字對話
- 圖片分析
- 音頻處理
- 網絡搜索（可選）
- 思考過程顯示（適用於思考型模型）

### 表情符號和按鈕控制

除了斜杠命令外，歸終還支持通過消息上的表情符號和按鈕來控制音樂播放：

- ⏯️ - 暫停/恢復播放
- ⏭️ - 跳過當前歌曲
- 🔁 - 切換循環模式
- 🔀 - 隨機播放隊列
- 📝 - 查看歌詞
- ⏹️ - 停止播放

### 常見問題解答

**問：我的命令沒有響應怎麼辦？**
答：確保歸終機器人有正確的權限，並檢查是否在正確的頻道中使用命令。

**問：如何查看我可以使用的命令列表？**
答：使用`/help`命令可以查看所有可用命令。

**問：如何快速添加多首歌曲到隊列？**
答：可以使用`/play`命令多次添加，或者直接添加播放列表鏈接，如`/play https://www.youtube.com/playlist?list=...`。

---

如果您有任何關於命令的問題或建議，請在[GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues)中提出，或加入我們的[Discord服務器](https://discord.gg/GfUY7ynvXN)尋求幫助。