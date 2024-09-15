import ast
import enum
import os
import sys
from typing import Any, Optional
import gradio as gr
import importlib
import json
import urllib.parse
from fastapi import FastAPI
from modules import script_callbacks, shared

prefix = "/whapi/v1"

allowed_preview_extensions = ["png", "jpg", "jpeg", "webp", "gif"]

class UI_TYPE(enum.Enum):
    Unknown = 1
    A1111 = 2
    NEW_FORGE = 3

class WeightHelperAPI:

    instance = None

    network = None
    network_lora = None
    ui_type = None

    @staticmethod
    def init_endpoints(_: gr.Blocks, app: FastAPI):
        if not WeightHelperAPI.instance:
            WeightHelperAPI.instance = WeightHelperAPI()

        instance = WeightHelperAPI.instance
        @app.post(prefix + "/get_template")
        async def _():
            return instance.get_template()
        @app.post(prefix + "/get_metadata")
        async def _(key: str):
            instance.__initialize()
            return instance.get_metadata(key)
        @app.post(prefix + "/get_preview_info")
        async def _(key: str):
            instance.__initialize()
            return instance.get_preview_info(key)

    def __new__(cls, *args, **kwargs):
        if not cls.instance:
            cls.instance = super(WeightHelperAPI, cls).__new__(cls, *args, **kwargs)
        return cls.instance

    def __initialize(self):
        if self.network_lora is not None or self.ui_type is not None:
            return

        try:
            from modules_forge import forge_version
            self.ui_type = UI_TYPE.NEW_FORGE
        except:
            self.ui_type = UI_TYPE.A1111

        try:
            if self.ui_type == UI_TYPE.NEW_FORGE:
                self.network = importlib.import_module("extensions-builtin.sd_forge_lora.network")
                self.network_lora = importlib.import_module("extensions-builtin.sd_forge_lora.ui_extra_networks_lora").networks
            else:
                self.network = importlib.import_module("extensions-builtin.Lora.network")
                self.network_lora = importlib.import_module("extensions-builtin.Lora.ui_extra_networks_lora").networks
        except Exception as e:
            self.ui_type = UI_TYPE.Unknown
            print(e)

    def __get_lora_on_disk(self, key):
        if self.network_lora:
            lora_on_disk = self.network_lora.available_network_aliases.get(key)
            if not lora_on_disk:
                # sdnext
                lora_on_disk = next((v for v in self.network_lora.available_network_aliases.values() if v.alias == key), None)
            return lora_on_disk
        return None

    def get_template(self):
        template_path = os.path.join(__file__, "../../html/template.hbs")
        try:
            with open(template_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except OSError:
            pass

    def get_metadata(self, key) -> dict[str, Optional[str]]:
        ret: dict[str, Optional[str]] = {
            "sd_version": None,
            "algorithm": None,
            "base_model": None
        }

        lora_on_disk = self.__get_lora_on_disk(key)
        if lora_on_disk:
            ret["sd_version"] = self.__get_sd_version(lora_on_disk)

            metadata = lora_on_disk.metadata
            ss_network_args = self.__get_network_args(lora_on_disk)
            ret["algorithm"] = self.__get_algorithm(metadata, ss_network_args)

            model_path, _ = os.path.splitext(lora_on_disk.filename)
            lora_json = self.__get_lora_json(model_path)
            json_sd_version = lora_json.get("sd version", None)
            if json_sd_version:
                ret["sd_version"] = json_sd_version

            civitai_info = self.__find_civitai_info(model_path)
            ret["base_model"] = civitai_info.get("baseModel", None)

        return ret

    def get_preview_info(self, key):
        ret: dict[str, Optional[bool | str | list[str]]] = {
            "model_id": None,
            "trigger_words": None,
            "negative_trigger_words": [],
            "model_name": None,
            "preview_url": None,
            "has_metadata": False,
            "description": None,
        }

        lora_on_disk = self.__get_lora_on_disk(key)
        if lora_on_disk:
            model_path, _ = os.path.splitext(lora_on_disk.filename)
            ret["model_name"] = lora_on_disk.name
            ret["preview_url"] = self.__find_preview(model_path)
            ret["has_metadata"] = self.__find_metadata(lora_on_disk)
            ret["description"] = self.__find_description(model_path)

            trigger_words = []
            civitai_info = self.__find_civitai_info(model_path)
            ret["model_id"] = civitai_info.get("modelId", None)
            trigger_words = civitai_info.get("trainedWords", [])
            trigger_words = ",".join(trigger_words).split(",")
            ret["trigger_words"] = [w.strip() for w in trigger_words if w]

            lora_json = self.__get_lora_json(model_path)

            activation_text = lora_json.get("activation text", "")
            if activation_text:
                activation_text = activation_text.split(",")
                activation_text = [w.strip() for w in activation_text if w]
                ret["trigger_words"] = activation_text

            negative_text = lora_json.get("negative text", "")
            if negative_text:
                negative_text = negative_text.split(",")
                negative_text = [w.strip() for w in negative_text if w]
                ret["negative_trigger_words"] = negative_text

            json_description = lora_json.get("description", None)
            if json_description:
                ret["description"] = json_description

        return ret

    def __get_sd_version(self, lora) -> Optional[str]:
        if self.ui_type == UI_TYPE.A1111:
            sd_version: Optional[str] = lora.sd_version.name
            if sd_version and self.network:
                if sd_version == self.network.SdVersion.SD1.name or sd_version == self.network.SdVersion.SD2.name:
                    return "SD"
                elif sd_version == self.network.SdVersion.SDXL.name:
                    return "SDXL"
                return sd_version
        elif self.ui_type == UI_TYPE.NEW_FORGE:
            base_model_version: Optional[str] = lora.metadata.get("ss_base_model_version")
            if base_model_version:
                base_model_version = base_model_version.lower()
                if "sd_" in base_model_version:
                    return "SD"
                if "sd3" in base_model_version:
                    return "SD"
                elif "sdxl" in base_model_version:
                    return "SDXL"
                elif "flux" in base_model_version:
                    return "FLUX"
                return None
        return None

    def __get_algorithm(self, metadata, ss_network_args) -> Optional[str]:
        ss_network_module = metadata.get("ss_network_module")
        if not ss_network_module or ss_network_module == "Unknown":
            return None

        conv_dim = float(ss_network_args.get("conv_dim", "-1"))
        conv_alpha = float(ss_network_args.get("conv_alpha", "-1"))
        algo = ss_network_args.get("algo", "").lower()
        unit = ss_network_args.get("unit", "").lower()
        dora_wd = ss_network_args.get("dora_wd", False)

        if ss_network_module.find("locon.locon_kohya") >= 0:
            return "LoCon"

        elif ss_network_module.find("lycoris.kohya") >= 0:
            algoName = ""
            if dora_wd:
                algoName = "(DoRA)"
            elif algo == "lora":
                algoName += "(LoCon)"
            elif algo == "locon":
                if unit:
                    algoName += "(DyLoRA)"
                else:
                    algoName += "(LoCon)"
            elif algo == "loha":
                algoName += "(LoHa)"
            elif algo == "lokr":
                algoName += "(Lokr)"
            elif algo == "ia3":
                algoName += "(IA3)"
            elif algo == "full":
                algoName += "(Full)"
            elif algo == "glora":
                algoName += "(GLoRA)"

            return f"LyCORIS{algoName}"

        elif ss_network_module.find("networks.dylora") >= 0:
            if algo == "dylora" and unit:
                if conv_dim > 0 or conv_alpha > 0:
                    return "DyLoRA(C3Lier)"
            return "DyLoRA(LierLa)"

        elif conv_dim > 0 or conv_alpha > 0:
            return "LoRA(C3Lier)"

        else:
            return "LoRA(LierLa)"

    def __get_network_args(self, lora) -> dict[str, Any]:
        metadata = lora.metadata
        ss_network_args = metadata.get("ss_network_args", {})
        if type(ss_network_args) is str:
            try:
                ss_network_args = ast.literal_eval(ss_network_args)
            except Exception:
                ss_network_args = {}
        return ss_network_args

    def __get_lora_json(self, path) -> dict[str, Any]:
        if path:
            lora_json = f"{path}.json"
            if os.path.exists(lora_json):
                try:
                    with open(lora_json, "r", encoding="utf-8", errors="replace") as f:
                        return json.load(f)
                except OSError:
                    pass
        return {}

    def __link_preview(self, filename) -> str:
        quoted_filename = urllib.parse.quote(filename.replace('\\', '/'))
        #use browser cache
        #mtime, _ = self.lister.mctime(filename)
        #return f"./sd_extra_networks/thumb?filename={quoted_filename}&mtime={mtime}"
        return f"./sd_extra_networks/thumb?filename={quoted_filename}"

    def __find_preview(self, path) -> str:
        if path:
            potential_files = sum([[f"{path}.{ext}", f"{path}.preview.{ext}"] for ext in allowed_preview_extensions], [])
            for file in potential_files:
                if os.path.exists(file):
                    return self.__link_preview(file)
        return "./file=html/card-no-preview.png"

    def __find_metadata(self, lora) -> bool:
        return len(lora.metadata) > 0 if lora else False

    #@functools.cache
    def __find_description(self, path) -> Optional[str]:
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
    def __find_civitai_info(self, path) -> dict[str, Any]:
        if path:
            civitai_info = f"{path}.civitai.info"
            if os.path.exists(civitai_info):
                try:
                    with open(civitai_info, "r", encoding="utf-8", errors="replace") as f:
                        return json.load(f)
                except OSError:
                    pass
        return {}

def on_ui_settings():
    """
    Set up the UI settings for the weight helper by adding options to the shared configuration.
    """
    section = ('weight_helper', 'Weight Helper')

    shared.options_templates.update(shared.options_section(section, {
        'weight_helper_enabled': shared.OptionInfo(True, 'Enabled'),
        'weight_helper_context_menu_scale': shared.OptionInfo(0.8, "Context Menu Scale", gr.Number),
        'weight_helper_using_execCommand': shared.OptionInfo(True, "Use the deprecated execCommand function to replace text."
        ).info(
            "You can use 'undo' to revert the text to its previous state, "
            "but it will no longer be updated in real-time."
        ),

        "weight_helper_slider_length": shared.OptionInfo(160, "Slider Length (px)", gr.Number),

        "weight_helper_te_min": shared.OptionInfo(0, "TEnc Min Value", gr.Number),
        "weight_helper_te_max": shared.OptionInfo(1, "TEnc Max Value", gr.Number),
        "weight_helper_te_step": shared.OptionInfo(0.05, "TEnc Step", gr.Number),

        "weight_helper_unet_min": shared.OptionInfo(0, "UNet Min Value", gr.Number),
        "weight_helper_unet_max": shared.OptionInfo(1, "UNet Max Value", gr.Number),
        "weight_helper_unet_step": shared.OptionInfo(0.05, "UNet Step", gr.Number),

        "weight_helper_dyn_min": shared.OptionInfo(0, "Dyn Min Value", gr.Number),
        "weight_helper_dyn_max": shared.OptionInfo(128, "Dyn Max Value", gr.Number),
        "weight_helper_dyn_step": shared.OptionInfo(8, "Dyn Step", gr.Number),

        "weight_helper_lbw_min": shared.OptionInfo(0, "LBW (LoRA Block Weight) Min Value", gr.Number),
        "weight_helper_lbw_max": shared.OptionInfo(1, "LBW (LoRA Block Weight) Max Value", gr.Number),
        "weight_helper_lbw_step": shared.OptionInfo(0.05, "LBW (LoRA Block Weight) Step", gr.Number),

        'weight_helper_show_preview': shared.OptionInfo(True, 'Show Preview'),
        "weight_helper_preview_height": shared.OptionInfo(400, "Preview Height (px)", gr.Number),
        "weight_helper_preview_position": shared.OptionInfo("Top Right", "Preview Position", gr.Radio, {
            "choices": ["Top Right", "Bottom Right", "Top Left", "Bottom Left"]
        }),

        "weight_helper_lbw_lora_sd_block_points": shared.OptionInfo(
            "BASE, IN01-IN04, IN05-IN08, M00, OUT03-OUT06, OUT07-OUT11",
            "Advanced option - LoRA-LierLa block points"
        ).info(
            "default: BASE, IN01-IN04, IN05-IN08, M00, OUT03-OUT06, OUT07-OUT11"
        ),
        "weight_helper_lbw_lycoris_sd_block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LyCORIS or LoRA-C3Lier block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11"
        ),
        "weight_helper_lbw_lora_sdxl_block_points": shared.OptionInfo(
            "BASE, IN04-IN08, M00, OUT00-OUT05",
            "Advanced option - SDXL LoRA-LierLa block points"
        ).info(
            "default: BASE, IN04-IN08, M00, OUT00-OUT05"
        ),
        "weight_helper_lbw_lycoris_sdxl_block_points": shared.OptionInfo(
            "BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT08",
            "Advanced option - SDXL LyCORIS or LoRA-C3Lier block points"
        ).info(
            "default: BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT08"
        )
    }))

script_callbacks.on_ui_settings(on_ui_settings)
script_callbacks.on_app_started(WeightHelperAPI.init_endpoints)
