import ast
import os
import gradio as gr
import importlib
import json
import urllib.parse
from fastapi import FastAPI
from modules import script_callbacks, shared

prefix = "/whapi/v1"

allowed_preview_extensions = ["png", "jpg", "jpeg", "webp", "gif"]

class WeightHelperAPI:

    instance = None

    @staticmethod
    def init_endpoints(_: gr.Blocks, app: FastAPI):
        if not WeightHelperAPI.instance:
            WeightHelperAPI.instance = WeightHelperAPI()

        instance = WeightHelperAPI.instance
        @app.post(prefix + "/get_lora_info")
        async def _(key: str):
            return instance.get_lora_info(key)

    def __new__(cls, *args, **kwargs):
        if not cls.instance:
            cls.instance = super(WeightHelperAPI, cls).__new__(cls, *args, **kwargs)
        return cls.instance

    def __init__(self):
        self.network = importlib.import_module("extensions-builtin.Lora.network")

    def __get_networks_lora(self):
        try:
            return importlib.import_module("extensions-builtin.Lora.ui_extra_networks_lora").networks
        except Exception:
            return None

    def get_lora_info(self, key):
        lora_on_disk = None
        model_name = key
        sd_version = None
        ckpt_version = None
        network_module = None
        model_path = None
        model_id = None
        trigger_words = []

        networks_lora = self.__get_networks_lora()
        if networks_lora:
            lora_on_disk = networks_lora.available_network_aliases.get(key)
            if not lora_on_disk:
                # sdnext
                lora_on_disk = next((v for v in networks_lora.available_network_aliases.values() if v.alias == key), None)
            if lora_on_disk:
                sd_version, ckpt_version = self.__get_sd_version(lora_on_disk)
                network_module = self.__get_network_module(lora_on_disk)
                model_path, _ = os.path.splitext(lora_on_disk.filename)
                model_name = lora_on_disk.name

        preview_url = self.__find_preview(model_path)
        has_metadata = self.__find_metadata(lora_on_disk)
        description = self.__find_description(model_path)
        civitai_info = self.__find_civitai_info(model_path)
        if civitai_info:
            model_id = civitai_info.get("modelId")
            trigger_words = ",".join(civitai_info.get("trainedWords")).split(",")
            trigger_words = [w.strip() for w in trigger_words if w]

        return {
            "sd_version": sd_version,
            "ckpt_version": ckpt_version,
            "network_module": network_module,
            "model_id": model_id,
            "trigger_words": trigger_words,
            "model_name": model_name,
            "preview_url": preview_url,
            "has_metadata": has_metadata,
            "description": description,
        }

    def __get_sd_version(self, lora):
        sd_version = lora.sd_version.name
        if sd_version:
            if sd_version == self.network.SdVersion.SD1.name or sd_version == self.network.SdVersion.SD2.name:
                sd_version = "SD"
            elif sd_version == self.network.SdVersion.SDXL.name:
                sd_version = "SDXL"
            else:
                sd_version = None
        else:
            sd_version = None

        if shared.sd_model.is_sd1 or shared.sd_model.is_sd2:
            model_version = "SD"
        elif shared.sd_model.is_sdxl:
            model_version = "SDXL"
        else:
            model_version = None

        return sd_version, model_version

    def __get_network_module(self, lora):
        metadata = lora.metadata
        ss_network_module = metadata.get("ss_network_module")
        if not ss_network_module or ss_network_module == "Unknown":
            return None
        if ss_network_module.find("lycoris.kohya") >= 0:
            return "LyCORIS"
        if ss_network_module.find("locon.locon_kohya") >= 0:
            return "LyCORIS"

        ss_network_args = metadata.get("ss_network_args", {})
        if type(ss_network_args) is str:
            try:
                ss_network_args = ast.literal_eval(ss_network_args)
            except Exception:
                ss_network_args = {}

        conv_dim = int(ss_network_args.get("conv_dim", "-1"))
        if (conv_dim >= 0):
            return "LoRA-C3Lier"

        conv_alpha = int(ss_network_args.get("conv_alpha", "-1"))
        if (conv_alpha >= 0):
            return "LoRA-C3Lier"

        return "LoRA-LierLa"

    def __link_preview(self, filename):
        quoted_filename = urllib.parse.quote(filename.replace('\\', '/'))
        #use browser cache
        #mtime, _ = self.lister.mctime(filename)
        #return f"./sd_extra_networks/thumb?filename={quoted_filename}&mtime={mtime}"
        return f"./sd_extra_networks/thumb?filename={quoted_filename}"

    def __find_preview(self, path):
        if path:
            potential_files = sum([[f"{path}.{ext}", f"{path}.preview.{ext}"] for ext in allowed_preview_extensions], [])
            for file in potential_files:
                if os.path.exists(file):
                    return self.__link_preview(file)
        return "./file=html/card-no-preview.png"

    def __find_metadata(self, lora):
        return len(lora.metadata) > 0 if lora else False

    #@functools.cache
    def __find_description(self, path):
        if path:
            for file in [f"{path}.txt", f"{path}.description.txt"]:
                if os.path.exists(file):
                    try:
                        with open(file, "r", encoding="utf-8", errors="replace") as f:
                            return f.read()
                    except OSError:
                        pass
        return None

    #@functools.cache
    def __find_civitai_info(self, path):
        if path:
            civitai_info = f"{path}.civitai.info"
            if os.path.exists(civitai_info):
                try:
                    with open(civitai_info, "r", encoding="utf-8", errors="replace") as f:
                        return json.load(f)
                except OSError:
                    pass
        return None

def on_ui_settings():
    """
    Set up the UI settings for the weight helper by adding options to the shared configuration.
    """
    section = ('weight_helper', 'Weight Helper')

    shared.options_templates.update(shared.options_section(section, {
        'weight_helper_enabled': shared.OptionInfo(True, 'Enabled'),
        'weight_helper_context_menu_scale': shared.OptionInfo(0.8, "Context menu scale", gr.Number),
        'weight_helper_using_execCommand': shared.OptionInfo(
            False,'Using the deprecated execCommand function to replace text.'
        ).info(
            "In exchange for no longer being updated in real-time, "
            "you can use 'undo' to revert the text to its previous state."
        ),
        'weight_helper_use_lyco_tag': shared.OptionInfo(False, 'Use \'lyco\' tag for LyCORIS. (for legacy compatibility)'),
        'weight_helper_use_default_setting': shared.OptionInfo(
            False, "Use default setting for unrecognized LoRA types."
        ).info(
            "When enabled, this option sets the LoRA type to 'LoRA-LierLa' if the tag is 'lora', "
            "or 'LyCORIS' if the tag is 'lyco', in cases where the LoRA type cannot be determined. "
            "Additionally, if the LoRA's SD version cannot be identified, it will be set to match the version of the currently applied checkpoint."
        ),

        "weight_helper_te_min": shared.OptionInfo(0, "TEnc min value", gr.Number),
        "weight_helper_te_max": shared.OptionInfo(1, "TEnc max value", gr.Number),
        "weight_helper_te_step": shared.OptionInfo(0.05, "TEnc step", gr.Number),

        "weight_helper_unet_min": shared.OptionInfo(0, "UNet min value", gr.Number),
        "weight_helper_unet_max": shared.OptionInfo(1, "UNet max value", gr.Number),
        "weight_helper_unet_step": shared.OptionInfo(0.05, "UNet step", gr.Number),

        "weight_helper_dyn_min": shared.OptionInfo(0, "Dyn min value", gr.Number),
        "weight_helper_dyn_max": shared.OptionInfo(128, "Dyn max value", gr.Number),
        "weight_helper_dyn_step": shared.OptionInfo(8, "Dyn step", gr.Number),

        "weight_helper_lbw_min": shared.OptionInfo(0, "LBW(Lora Block Weight) min value", gr.Number),
        "weight_helper_lbw_max": shared.OptionInfo(1, "LBW(Lora Block Weight) max value", gr.Number),
        "weight_helper_lbw_step": shared.OptionInfo(0.05, "LBW(Lora Block Weight) step", gr.Number),

        'weight_helper_show_preview': shared.OptionInfo(True, 'Show preview'),
        "weight_helper_preview_height": shared.OptionInfo(400, "Preview height(px)", gr.Number),
        "weight_helper_preview_position": shared.OptionInfo("Top Right", "Preview position", gr.Radio, {
            "choices": ["Top Right", "Bottom Right", "Top Left", "Bottom Left"]
        }),

        "weight_helper_lbw_lierla_sd_block_points": shared.OptionInfo(
            "BASE, IN01-IN04, IN05-IN08, M00, OUT03-OUT06, OUT07-OUT11",
            "Advanced option - LoRA-LierLa block points"
        ).info(
            "default: BASE, IN01-IN04, IN05-IN08, M00, OUT03-OUT06, OUT07-OUT11"
        ),
        "weight_helper_lbw_c3lier_lyco_sd_block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LoRA-C3Lier or LyCORIS block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11"
        ),
        "weight_helper_lbw_lierla_sdxl_block_points": shared.OptionInfo(
            "BASE, IN04-IN08, M00, OUT00-OUT05",
            "Advanced option - SDXL LoRA-LierLa block points"
        ).info(
            "default: BASE, IN04-IN08, M00, OUT00-OUT05"
        ),
        "weight_helper_lbw_c3lier_lyco_sdxl_block_points": shared.OptionInfo(
            "BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT08",
            "Advanced option - SDXL LoRA-C3Lier or LyCORIS block points"
        ).info(
            "default: BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT08"
        )
    }))

script_callbacks.on_ui_settings(on_ui_settings)
script_callbacks.on_app_started(WeightHelperAPI.init_endpoints)
