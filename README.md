日本語版は下に記載しています。
<br><br>
<img src="https://github.com/nihedon/sd-webui-weight-helper/assets/66118290/eb5fe152-be7a-4eb6-8a7d-bb5c4231ffd2" height="600px">

# Weight Helper Extension

## Overview

**Weight Helper** is an extension that allows you to visually adjust the weights of Lora and Lyco with mouse operations.<br>
You can adjust the magnification of each weight block through the context menu.<br>
Note: The LoRA Block Weight extension is required to use this extension.

## Installation

1. Open the [Extensions] tab in Stable Diffusion Web UI.
2. Select [Install from URL].
3. Enter the following URL and execute the installation.
```
https://github.com/nihedon/sd-webui-weight-helper.git
```

## Usage

1. Right-click on a Lora or Lyco tag to open the context menu.
   - `<lora:lora_name:1.0>`
   - `<lyco:lyco_name:1.0>`
2. Move the weight slider to adjust the magnification of each weight block.

## Features

- Easy to set weight values with mouse operations.
- Use of preset values from Lora Block Weight is possible.

## Configuration Options

- Scale adjustment in the context menu.
- Use of the `execCommand` function for text replacement (Note: execCommand is a deprecated function, but it allows for "undo" and "redo").
- Display of UNet, Dyn, Start, and Stop sliders.
- Setting of minimum, maximum, and step values for each weight slider.
- Detailed settings for LBW's Lora and Lyco blocks.

## Guaranteed Operating Environment

- Stable Diffusion AUTOMATIC1111
- Windows
- Google Chrome

## Acknowledgments

We would like to express our deep gratitude to **hako-mikan**, the author of **LoRA Block Weight**, for creating this extension.
```
https://github.com/hako-mikan/sd-webui-lora-block-weight
```

## License

This project is published under the [MIT License](LICENSE).

<br><br>

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

