
import importlib
from scripts import const

network = None
network_lora = None
ui_type = None

try:
    from modules_forge import forge_version  # noqa: F401
    ui_type = const.UI_TYPE.NEW_FORGE
except ImportError:
    ui_type = const.UI_TYPE.A1111

try:
    network = importlib.import_module("extensions-builtin.sd_forge_lora.network")
    network_lora = importlib.import_module("extensions-builtin.sd_forge_lora.ui_extra_networks_lora").networks
except Exception:
    pass

if network_lora is None:
    try:
        network = importlib.import_module("extensions-builtin.Lora.network")
        network_lora = importlib.import_module("extensions-builtin.Lora.ui_extra_networks_lora").networks
    except Exception:
        pass

if network_lora is None:
    ui_type = const.UI_TYPE.Unknown
