<br><br>
<img src="https://github.com/nihedon/sd-webui-weight-helper/assets/66118290/f7079e1c-3b2a-426c-b3a2-1a7ccf57cab2" height="600px">

# Weight Helper 拡張機能

## 概要

**Weight Helper** はLoraやLycoのウェイトをマウス操作で視覚的に調整できる拡張機能です。<br>
コンテキストメニューを通じて各ウェイトブロックの倍率を調整できます。<br>
注：この拡張機能を利用するにはLoRA Block Weight拡張機能が必要です。

## インストール

1. Stable Diffusion Web UIの[拡張機能]タブを開く
2. [URLからインストール]を選択
3. 以下のURLを入力し、インストールを実行
```
https://github.com/nihedon/sd-webui-weight-helper.git
```

## 使い方

1. LoraまたはLycoのタグを右クリックしてコンテキストメニューを開く
   - `<lora:lora_name:1.0>`
   - `<lyco:lyco_name:1.0>`
2. ウェイトスライダーを動かして各ウェイトブロックの倍率を調整

## 特徴

- マウス操作でウェイト値を容易に設定できます。
- Lora Block Weightのプリセット値の利用が可能です。

## 設定オプション

- コンテキストメニューのスケール調整
- テキスト置換に `execCommand` 関数の使用（注：execCommandは非推奨関数ですが、「元に戻す」「やり直し」が使えます）
- UNet、Dyn、Start、およびStopスライダーの表示
- 各ウェイトスライダーの最小値、最大値、ステップ数の設定
- LBWのLoraおよびLycoブロックの詳細設定

## 動作保証環境

- Stable Difusion AUTOMATIC1111
- Windows
- Google Chrome

## 謝辞

この拡張機能を作成するにあたり、**LoRA Block Weight** の作者である **hako-mikan** 様に深く感謝申し上げます。
```
https://github.com/hako-mikan/sd-webui-lora-block-weight
```

## ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。
