<img src="https://github.com/nihedon/sd-webui-weight-helper/assets/66118290/f7079e1c-3b2a-426c-b3a2-1a7ccf57cab2" height="600px">

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
2. Choose "LoRA" or "LyCORIS" according to the tag, and select "SDXL" if it's for the SDXL version.
3. Move the weight slider to adjust the magnification of each weight block.
4. UNet, Dyn, Start, and Stop will be hidden by default, but if configured, you can display them by pressing the "show extra options" button.
5. Save your favorite weight settings by clicking the "★" icon at the top left of the context menu.
   Important: Saved settings are stored in LocalStorage, but any unsaved history will be deleted upon refreshing the screen.

## Features

- Easy to set weight values with mouse operations.
- Use of preset values from Lora Block Weight is possible.

## Configuration Options

- Scale adjustment in the context menu.
- Use of the `execCommand` function for text replacement (Note: execCommand is a deprecated function, but it allows for "undo" and "redo").
- Display of UNet, Dyn, Start, and Stop sliders.
- Setting of minimum, maximum, and step values for each weight slider.
- Detailed settings for LBW's Lora and Lyco blocks.
- Option to display or hide previews, and settings for preview size and position.
- Settings for block weight segmentation.

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
