# Muse Gadget Flasher for M5StickS3

[![Open Web Flasher](https://img.shields.io/badge/Web%20Flasher-Open%20in%20Browser-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://rev-hermit.github.io/muse-gadget-flasher/)  
👉 **Web 版はこちらから直接利用できます:** **[https://rev-hermit.github.io/muse-gadget-flasher/](https://rev-hermit.github.io/muse-gadget-flasher/)**

---

[English](#english) | [日本語](#japanese)

---

<a name="english"></a>
## English

A standalone Web flasher to flash and configure the Muse Gadget firmware on the **M5Stack M5StickS3**.
Works completely offline without external CDN dependencies.

> **About the Firmware**  
> The firmware included here is a custom build based on the official [muse-gadget-sdk](https://github.com/facebookincubator/muse-gadget-sdk), enhanced with **optimized Japanese typography (Noto Sans JP)** and **multi-Wi-Fi profile storage with on-device menu switching**.

### How to Use

1. **Host locally or open via HTTPS**  
   Web Serial requires **localhost** or **HTTPS** (`file://` will not work).
   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   # Open http://127.0.0.1:8000/ in desktop Chrome or Edge
   ```

2. **Connect M5StickS3**  
   Connect with a USB **data** cable.
   - **First time:** Long-press the side button until the internal green LED flashes (Download Mode).
   - **Updating:** If Muse is already running, connect directly (no button press required).

3. **Flash Firmware**  
   Select your preferred font, click **"Flash Firmware"** (or "ファームウェアを書き込む"), and select the serial port.
   If the screen remains dark after flashing, press the side button once to boot.

4. **Send Settings to Device**  
   Enter your SDK token and 2.4 GHz Wi-Fi credentials, then click **"Send Token & Wi-Fi"**.  
   *Note: Passwords are not saved in browser storage. You will still need to select Wi-Fi in the Muse mobile app during initial pairing.*

---

<a name="japanese"></a>
## 日本語

M5StickS3 に Muse Gadget ファームウェアを書き込み、初期設定（SDK トークンおよび Wi-Fi 設定）を行う Web フラッシャーです。
外部 CDN やインターネット接続への依存がなく、ローカル環境でも動作します。

> **ファームウェアについて**  
> 本ツールで書き込まれるファームウェアは、公式の [muse-gadget-sdk](https://github.com/facebookincubator/muse-gadget-sdk) をベースに、**日本語フォント（Noto Sans JP）の最適化** および **Wi-Fi 複数登録・本体メニュー切替機能** を追加した M5StickS3 向けのカスタムビルドです。

### 使い方

1. **ローカルサーバーを起動してアクセスする**  
   Web Serial API を使用するため、**localhost** または **HTTPS** 環境で開く必要があります（`file://` では動作しません）。
   ```sh
   # 本ディレクトリ内でローカルサーバーを起動
   python3 -m http.server 8000 --bind 127.0.0.1
   # ブラウザでアクセス: http://127.0.0.1:8000/
   ```
   ※ ブラウザは **Google Chrome** または **Microsoft Edge**（デスクトップ版）をご使用ください。

2. **M5StickS3 を接続する**  
   USB データ通信対応ケーブルで M5StickS3 を PC に接続します。
   - **初回書き込み時**: 本体側面のボタンを長押しし、内部の緑色 LED が点滅したら書き込み待機状態（ダウンロードモード）に入っています。
   - **更新時**: すでに Muse が動作している場合は長押し不要です（そのまま接続してください）。

3. **ファームウェアを書き込む**  
   画面でフォントを選択し、「ファームウェアを書き込む」を押してポートを選択します。
   完了後、画面が暗い場合は側面ボタンを1回押して起動してください。

4. **本体へ設定を送信する**  
   SDK トークンおよび Wi-Fi ネットワーク（2.4 GHz 帯）を入力し、「トークンと Wi-Fi を送信」を実行します。
   ※ Wi-Fi パスワードはブラウザのストレージには保存されず、安全に送信されます。
   ※ ここで本体に複数 Wi-Fi を登録しておくと本体メニューからの切り替え等に便利ですが、**スマホ等の Muse アプリでペアリングを行う際にも、アプリ側で Wi-Fi の選択とパスワード入力が改めて必要**となります（Muse のセットアップ仕様です）。

---

### ディレクトリ構成 / Structure

```
index.html, app.js, style.css   … Web application
vendor/esp-web-tools/           … ESP Web Tools 10.4.0 (Apache-2.0)
firmware/sticks3/noto/          … Noto Sans JP build + manifest.json (Recommended)
firmware/sticks3/default/       … Standard GNU Unifont build + manifest.json
LICENSES/, NOTICE               … Licenses and notices
```

### 注意事項 / Notes

- SDK トークンおよび Wi-Fi パスワードはファームウェアバイナリには含まれていません（Web Serial を通じて本体 NVS に直接安全に保存されます）。
- M5StickS3 を工場出荷状態（UiFlow2 等）に戻したい場合は、M5Burner で `STICKS3` を選択して書き戻すことができます。

---

### 免責事項 / Disclaimer

#### 日本語
1. **非公式・無保証（AS-IS）**: 本ツールおよび同梱のファームウェアは、有志によるオープンソースのカスタムプロジェクトであり、現状有姿（AS-IS）で提供されます。明示・黙示を問わず、その動作、正確性、特定目的への適合性について一切の保証はありません。
2. **公式サポートなし**: Meta 公式の Muse Gadget SDK 自体も実験的なオープンソースプロジェクトであり、ESP32 等での動作や将来のサービス継続性に関して Meta による公式の動作保証やサポートは提供されていません。また、本ツールは Meta、Muse、M5Stack との直接の提携関係はなく、いかなる公式サポートも受けられません。
3. **自己責任の原則**: ファームウェアの書き込み、設定変更、デバイスの利用はすべて利用者の自己責任で行ってください。本ツールの使用または使用不能により生じたデバイスの故障・文鎮化、データ消失、発熱・バッテリートラブル、その他いかなる損害についても、製作者および関係者は一切の責任を負いません。

#### English
1. **Unofficial & As-Is**: This tool and the included firmware are community-contributed open source works provided on an "AS-IS" basis, without warranties of any kind, express or implied, including fitness for a particular purpose.
2. **No Official Support**: Meta's Muse Gadget SDK itself is an experimental open-source project; Meta provides no official warranty or product support for ESP32 devices. This tool is not affiliated with Meta, Muse, or M5Stack, and no official support is provided.
3. **Use at Your Own Risk**: Flashing firmware, modifying settings, and using the device are entirely at your own risk. The authors and contributors shall not be liable for any device bricking, hardware malfunctions, data loss, battery/thermal issues, or any other damages arising from the use of this tool.

