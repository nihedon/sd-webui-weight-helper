import gradio as gr
from fastapi import FastAPI
from modules import script_callbacks, shared
from scripts import api, const


def on_app_started(_: gr.Blocks, app: FastAPI):
    @app.post(const.API_PREFIX + "/get_metadata")
    async def _(key: str, force: bool = False):
        return api.get_metadata(key, force)

    @app.post(const.API_PREFIX + "/get_preview_info")
    async def _(key: str):
        return api.get_preview_info(key)


def on_ui_settings():
    """
    Set up the UI settings for the weight helper by adding options to the shared configuration.
    """
    section = ('weight_helper', 'Weight Helper')

    shared.options_templates.update(shared.options_section(section, {
        'weight_helper_enabled': shared.OptionInfo(True, 'Enabled'),
        'weight_helper_context_menu_scale': shared.OptionInfo(0.8, "Context Menu Scale", gr.Number),
        'weight_helper_using_execCommand': shared.OptionInfo(True, "Use the deprecated execCommand function to replace text.").info(
            "You can use 'undo' to revert the text to its previous state, "
            "but it will no longer be updated in real-time."),

        "weight_helper_slider_length": shared.OptionInfo(160, "Slider Length (px)", gr.Number),

        "weight_helper_TEnc_min": shared.OptionInfo(0, "TEnc Min Value", gr.Number),
        "weight_helper_TEnc_max": shared.OptionInfo(1, "TEnc Max Value", gr.Number),
        "weight_helper_TEnc_step": shared.OptionInfo(0.05, "TEnc Step", gr.Number),

        "weight_helper_UNet_min": shared.OptionInfo(0, "UNet Min Value", gr.Number),
        "weight_helper_UNet_max": shared.OptionInfo(1, "UNet Max Value", gr.Number),
        "weight_helper_UNet_step": shared.OptionInfo(0.05, "UNet Step", gr.Number),

        "weight_helper_LBW_min": shared.OptionInfo(0, "LBW (LoRA Block Weight) Min Value", gr.Number),
        "weight_helper_LBW_max": shared.OptionInfo(1, "LBW (LoRA Block Weight) Max Value", gr.Number),
        "weight_helper_LBW_step": shared.OptionInfo(0.05, "LBW (LoRA Block Weight) Step", gr.Number),

        'weight_helper_show_preview': shared.OptionInfo(True, 'Show Preview'),
        "weight_helper_preview_height": shared.OptionInfo(400, "Preview Height (px)", gr.Number),
        "weight_helper_preview_position": shared.OptionInfo("Top Right", "Preview Position", gr.Radio, {
            "choices": ["Top Right", "Bottom Right", "Top Left", "Bottom Left"]
        }),

        'weight_helper_parse_lora_blocks': shared.OptionInfo(True, '[experimental] Parse LoRA file to get block information'),

        "weight_helper_LBW_SD_lora_block_points": shared.OptionInfo(
            "BASE, IN01-IN04, IN05-IN08, M00, OUT03-OUT06, OUT07-OUT11",
            "Advanced option - LoRA-LierLa block points")
        .info("default: BASE, IN01-IN04, IN05-IN08, M00, OUT03-OUT06, OUT07-OUT11"),
        "weight_helper_LBW_SD_lycoris_block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LyCORIS or LoRA-C3Lier block points")
        .info("default: BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11"),

        "weight_helper_LBW_SDXL_lora_block_points": shared.OptionInfo(
            "BASE, IN04-IN08, M00, OUT00-OUT05",
            "Advanced option - SDXL LoRA-LierLa block points")
        .info("default: BASE, IN04-IN08, M00, OUT00-OUT05"),
        "weight_helper_LBW_SDXL_lycoris_block_points": shared.OptionInfo(
            "BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT08",
            "Advanced option - SDXL LyCORIS or LoRA-C3Lier block points")
        .info("default: BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT08"),

        "weight_helper_LBW_Flux_lora_block_points": shared.OptionInfo(
            "CLIP, T5, IN, OUT, D00-D18, S00-S18, S19-S37",
            "Advanced option - Flux LoRA-LierLa block points")
        .info("default: CLIP, T5, IN, OUT, D00-D18, S00-S18, S19-S37"),
        "weight_helper_LBW_Flux_lycoris_block_points": shared.OptionInfo(
            "CLIP, T5, IN, OUT, D00-D18, S00-S18, S19-S37",
            "Advanced option - Flux LyCORIS or LoRA-C3Lier block points")
        .info("default: CLIP, T5, IN, OUT, D00-D18, S00-S18, S19-S37"),
    }))


script_callbacks.on_ui_settings(on_ui_settings)
script_callbacks.on_app_started(on_app_started)
