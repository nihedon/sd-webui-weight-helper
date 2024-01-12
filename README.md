日本語版は下に記載しています。

# Weight Helper
<img src="https://github.com/nihedon/sd-webui-weight-helper/assets/66118290/eb5fe152-be7a-4eb6-8a7d-bb5c4231ffd2" height="600px">

## Overview

**Weight Helper** is an extension that allows you to specify weights for Lora or Lyco through the context menu.

## Installation

1. Open the [Extensions] tab.
2. Select the [Install from URL] tab.
3. Enter the following URL to install:
```
https://github.com/nihedon/sd-webui-weight-helper.git
```

## Usage

1. Right-click on a Lora or Lyco tag. The format is as follows:
   - `<lora:lora_name:multiplier>`
   - `<lyco:lyco_name:multiplier>`
2. When the context menu is displayed, move the slider to change the weight.
3. After making the changes, click outside the context menu to close it.
   Note: The value will be applied when the context menu is closed. Pressing the "Generate" button while the context menu is open will not apply the changes.

## Features

- Options allow you to specify minimum and maximum values and the number of steps for the slider.
- The LBW (Lora Block Weight) value is integrated with Lora Block Weight presets.

## Known Issues

- It is guaranteed to work only in the following environments:
  - Lora Block Weight installed
  - Google Chrome
  - txt2img

## Acknowledgments

We would like to express our gratitude to **hako-mikan**, the author of **Lora Block Weight**.
```
https://github.com/hako-mikan/sd-webui-lora-block-weight
```


## 概要

**Weight Helper** は、LoraまたはLycoのウェイト指定をコンテキストメニューから行えるようにする拡張機能です。

## インストール方法

1. [Extensions]タブを開きます。
2. [Install from URL]タブを選択します。
3. 以下のURLを入力してインストールを行います。
```
https://github.com/nihedon/sd-webui-weight-helper.git
```

## 使い方

1. LoraまたはLycoのタグ上で右クリックします。フォーマットは以下の通りです。
   - `<lora:lora_name:multiplier>`
   - `<lyco:lyco_name:multiplier>`
2. コンテキストメニューが表示されたら、スライダーを動かしてウェイトを変更します。
3. 修正が終わったら、コンテキストメニュー外をクリックしてコンテキストメニューを閉じます。
   注意: コンテキストメニューが閉じられたときに値が反映されます。コンテキストメニューが表示されているときに「Generate」ボタンを押下しても反映されません。

## 機能

- オプションにより、最大値と最小値の指定、スライダーのステップ数の指定が可能です。
- LBW（Lora Block Weight）の値はLora Block Weightのプリセットと連携しています。

## 残課題

- 以下の環境でのみ動作保証しています。
  - Lora Block Weight導入済み
  - Google Chrome
  - txt2img

## 謝辞

**Lora Block Weight** の作者である **hako-mikan** 様に感謝いたします。
```
https://github.com/hako-mikan/sd-webui-lora-block-weight
```
