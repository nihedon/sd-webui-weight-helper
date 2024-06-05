'use strict';

const VERSION = "1.2.0"
localStorage.removeItem("weight_helper");
localStorage.removeItem("weight_helper_type");

var weight_helper_data = {};

var weight_helper_preview_info = {};

var sampling_steps;

class WeightSet {
    map;
    constructor() {
        this.map = new Map();
    }
    add(weightDataHash, weightData) {
        return this.map.set(weightDataHash, weightData);
    }
    has(weightDataHash) {
        return this.map.has(weightDataHash);
    }
    delete(weightDataHash) {
        return this.map.delete(weightDataHash);
    }
    clear() {
        return this.map.clear();
    }
    getAll() {
        return [...this.map.values()];
    }
}

class WeightData {
    VERSION;
    lbw_lora_type;
    lbw_sd_version;
    te;
    use_unet;
    unet;
    use_dyn;
    dyn;
    start;
    stop;
    lbw;
    lbwe;
    special;
    masks;

    constructor(data) {
        if (data) {
            Object.assign(this, data);
        }
    }

    isSpecial() {
        return this.special != null && this.special !== "";
    }

    clone() {
        return new WeightData(structuredClone(this));
    }

    equals(other) {
        if (other == null) {
            return false;
        }
        if (this.lbw_lora_type !== other.lbw_lora_type) {
            return false;
        }
        if (this.lbw_sd_version !== other.lbw_sd_version) {
            return false;
        }
        if (this.te[0] !== other.te[0]) {
            return false;
        }
        if (this.te[0] !== other.te[0]) {
            return false;
        }
        if (this.use_unet !== other.use_unet) {
            return false;
        }
        if (this.use_unet && (this.unet[0] != other.unet[0])) {
            return false;
        }
        if (this.use_dyn !== other.use_dyn) {
            return false;
        }
        if (this.use_dyn && (this.dyn[0] != other.dyn[0])) {
            return false;
        }
        if (this.start[0] !== other.start[0]) {
            return false;
        }
        let stop1 = this.stop[0] == null ? sampling_steps : this.stop[0];
        let stop2 = other.stop[0] == null ? sampling_steps : other.stop[0];
        if (stop1 !== stop2) {
            return false;
        }
        if (this.lbw.length !== other.lbw.length) {
            return false;
        }
        if (this.isSpecial()) {
            if (this.special !== other.special) {
                return false;
            }
        } else {
            for (let i = 0; i < this.lbw.length; i++) {
                if ((!this.masks || this.masks[i] === 1) && this.lbw[i] !== other.lbw[i]) {
                    return false;
                }
            }
        }
        return true;
    }

    hashCode() {
        let hash = 0;
        const calcHash = (v) => ((hash ^ v) << 5) - hash ^ v;
        hash = calcHash(strHashCode(this.lbw_lora_type));
        hash = calcHash(strHashCode(this.lbw_sd_version));
        hash = calcHash(this.te[0]);
        hash = calcHash(this.use_unet ? 1 : 0);
        hash = calcHash(this.use_unet ? this.unet[0] : 0);
        hash = calcHash(this.use_dyn ? 1 : 0);
        hash = calcHash(this.use_dyn ? this.dyn[0] : 0);
        hash = calcHash(this.start[0]/10);
        hash = calcHash(this.stop[0] == null ? sampling_steps : this.stop[0]);
        if (this.isSpecial()) {
            hash = calcHash(strHashCode(this.special));
        } else {
            for (let i = 0; i < this.lbw.length; i++) {
                const val = !this.masks || this.masks[i] === 1 ? this.lbw[i] : 0;
                hash = calcHash(val);
            }
        }
        return hash & 0xffffffff;
    }
}

class WeightHelper {

    static PLUGIN_DIRNAME = "sd-webui-weight-helper";
    static REGEX = /<([^:]+):([^:]+):([^>]+)>/;
    static TAG_TYPES = ["lora", "lyco"];

    static SPECIAL_PRESETS = {
        lora: {
            SD: [{ "XYZ (17)": "XYZ" }],
            SDXL: [{ "XYZ (12)": "XYZ" }]
        },
        lycoris: {
            SD: [{ "XYZ (26)": "XYZ" }],
            SDXL: [{ "XYZ (20)": "XYZ" }]
        },
        unknown: [{ "XYZ (26)": "XYZ" }]
    };

    static last_instance = undefined;

    static LORA_TYPE_PULLDOWN = {
        "LoRA(LierLa)": "lora",
        "LyCORIS,etc": "lycoris"
    };

    static LBW_WEIGHT_SD_VERSIONS = ["SD", "SDXL"];

    static LBW_WEIGHT_SETTINGS = {
        lora: {
            SD: {
                masks: [1,0,1,1,0,1,1,0,1,1,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN01-IN04", "IN05-IN08", "M00", "OUT03-OUT06", "OUT07-OUT11"]
            },
            SDXL: {
                masks: [1,0,0,0,0,1,1,0,1,1,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
                block_points: ["BASE", "IN04-IN08", "M00", "OUT00-OUT05"]
            }
        },
        lycoris: {
            SD: {
                masks: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN00-IN05", "IN06-IN11", "M00", "OUT00-OUT05", "OUT06-OUT11"]
            },
            SDXL: {
                masks: [1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
                block_points: ["BASE", "IN00-IN03", "IN04-IN08", "M00", "OUT00-OUT03", "OUT04-OUT08"]
            }
        },
        unknown: {
            masks: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            block_points: []
        }
    };

    WEIGHT_SETTINGS = {
        te: {
            label: "TEnc",
            min: opts.weight_helper_te_min * 100, max: opts.weight_helper_te_max * 100, default: 100, step: opts.weight_helper_te_step * 100
        },
        unet: {
            label: "UNet",
            min: opts.weight_helper_unet_min * 100, max: opts.weight_helper_unet_max * 100, default: undefined, step: opts.weight_helper_unet_step * 100
        },
        dyn: {
            label: "Dyn",
            min: opts.weight_helper_dyn_min * 100, max: opts.weight_helper_dyn_max * 100, default: undefined, step: opts.weight_helper_dyn_step * 100
        },
        start: {
            label: "Start",
            min: 0, max: undefined, default: 0, step: 100
        },
        stop: {
            label: "Stop",
            min: 0, max: undefined, default: undefined, step: 100
        },
        lbw: {
            labels: ["BASE", "IN00", "IN01", "IN02", "IN03", "IN04", "IN05", "IN06", "IN07", "IN08", "IN09", "IN10", "IN11", "M00", "OUT00", "OUT01", "OUT02", "OUT03", "OUT04", "OUT05", "OUT06", "OUT07", "OUT08", "OUT09", "OUT10", "OUT11"],
            min: opts.weight_helper_lbw_min * 100,
            max: opts.weight_helper_lbw_max * 100,
            default: 100,
            step: opts.weight_helper_lbw_step * 100
        }
    };

    weightData = {};

    usingExecCommand = false;

    tabId = null;
    offsetX = 0;
    offsetY = 0;
    isDragging = false;

    lbwPresetsMap = {};
    lbwPresetsValueKeyMap = {};
    weightUIs = {};

    metadata = {};
    previewInfo = {};

    tagName = null;
    name = null;
    nameHash = null;
    multiplier = null;
    currentHistory = null;
    currentBookmarkSet = new WeightSet();
    weightData = new WeightData();

    lastSelectionStart = null;
    lastSelectionEnd = null;
    lastText = null;

    historyIndex = 0;

    openedExtraOption = false;

    domCustomContextMenu = null;

    releaseFunctions = [];

    static attach(textarea) {
        textarea.addEventListener('contextmenu', (e) => {
            if (!opts.weight_helper_enabled) {
                return;
            }
            if (WeightHelper.last_instance) {
                e.preventDefault();
                WeightHelper.last_instance.close();
                return;
            }
            let selectedText = window.getSelection().toString();
            if (selectedText) {
                return;
            }
            const prompt = e.target.value;
            let tmpSelectionStart = e.target.selectionStart;
            const lCar = prompt.lastIndexOf("<", tmpSelectionStart - 1);
            const rCar = prompt.indexOf(">", tmpSelectionStart);
            if (lCar < 0 || rCar < 0) {
                return;
            }
            selectedText = prompt.substring(lCar, rCar + 1);
            if ((selectedText.match(/</g) || []).length != 1 || (selectedText.match(/>/g) || []).length != 1) {
                return;
            }
            tmpSelectionStart = lCar;
            const match = WeightHelper.REGEX.exec(selectedText);
            if (match) {
                const loraType = match[1].toLowerCase();
                const name = match[2];
                const multiplier = match[3];

                if (WeightHelper.TAG_TYPES.includes(loraType)) {
                    e.preventDefault();
                    const tabId = e.target.closest("[id^='tab_'][class*='tabitem']").id.split("_")[1];
                    const selectionStart = tmpSelectionStart + match.index;
                    const selectionEnd = selectionStart + match.input.trim().length;
                    const weightHelper = new WeightHelper(tabId, e.target, selectionStart, selectionEnd, loraType, name, multiplier);
                    weightHelper.setup().then(() => {
                        weightHelper.show(e.pageY + 15, e.pageX);
                    });
                }
            }
        });
    }

    constructor(tabId, textarea, selectionStart, selectionEnd, tagName, name, multiplier) {
        document.documentElement.style.setProperty('--weight-helper-slider_size', opts.weight_helper_slider_length);

        this.tabId = tabId;
        this.textarea = textarea;
        this.lastSelectionStart = selectionStart;
        this.lastSelectionEnd = selectionEnd;
        this.lastText = this.textarea.value.substring(this.lastSelectionStart, this.lastSelectionEnd);

        this.tagName = tagName;
        this.name = name;
        this.nameHash = strHashCode(name);
        this.multiplier = multiplier;

        const samplingSteps = gradioApp().getElementById(`${this.tabId}_steps`).querySelector("input");
        sampling_steps = parseInt(samplingSteps.value) * 100;

        const optBlockPattern = /((BASE|MID|M00|(IN|OUT)[0-9]{1,2}(-(IN|OUT)[0-9]{1,2})?) *(, *|$))+/;
        for (let loraType of Object.values(WeightHelper.LORA_TYPE_PULLDOWN)) {
            for (let sdVersion of WeightHelper.LBW_WEIGHT_SD_VERSIONS) {
                try {
                    let optBlockPoints = opts[`weight_helper_lbw_${loraType}_${sdVersion.toLowerCase()}_block_points`]
                    optBlockPoints = optBlockPoints.replace("MID", "M00");
                    if (optBlockPattern.exec(optBlockPoints)) {
                        const blockPoints = optBlockPoints.split(',').map(v => {
                            return v.trim().replace(/\d+/g, match => match.length === 1 ? `0${match}` : match);
                        });
                        this.#getLbwWeightSetting(loraType, sdVersion).block_points = blockPoints;
                    }
                } catch (e) {
                    console.warn(`${loraType}_${sdVersion} block definition format is invalid.`, e);
                }
            }
        }

        if (opts.weight_helper_using_execCommand) {
            if (typeof document.execCommand === 'function') {
                this.usingExecCommand = true;
            } else {
                console.warn("execCommand is not supported.");
            }
        }
    }

    async setup() {
        if (!(this.nameHash in weight_helper_data)) {
            weight_helper_data[this.nameHash] = { "bookmark": [], "history": [], "lora_info": {} }
        }

        if (!("lora_info" in weight_helper_data[this.nameHash])) {
            weight_helper_data[this.nameHash].lora_info = {};
        }
        const loraInfo = weight_helper_data[this.nameHash].lora_info;
        if ("metadata" in loraInfo) {
            this.metadata = loraInfo.metadata;
            this.weightData.lbw_sd_version = this.metadata.sd_version;
        }
        if ("selected_lora_type" in loraInfo) {
            this.weightData.lbw_lora_type = loraInfo.selected_lora_type.lbw_lora_type;
            this.weightData.lbw_sd_version = loraInfo.selected_lora_type.lbw_sd_version;
        } else {
            loraInfo.selected_lora_type = {};
        }
        if (this.nameHash in weight_helper_preview_info) {
            this.previewInfo = weight_helper_preview_info[this.nameHash];
        }

        this.WEIGHT_SETTINGS.start.max = sampling_steps;
        this.WEIGHT_SETTINGS.stop.max = sampling_steps;
        this.WEIGHT_SETTINGS.stop.default = sampling_steps;

        const lbwPreset = gradioApp().getElementById("lbw_ratiospreset").querySelector("textarea");
        let lbwPresetValue = lbwPreset.value ?? "";
        const lbwPresets = lbwPresetValue.split("\n").filter(e => e.trim() !== '');
        for (const loraType of Object.values(WeightHelper.LORA_TYPE_PULLDOWN)) {
            this.lbwPresetsMap[loraType] = {};
            this.lbwPresetsValueKeyMap[loraType] = {};
            for (const sdVersion of WeightHelper.LBW_WEIGHT_SD_VERSIONS) {
                let lbwPreset = {};
                let lbwPresetValueKey = {};

                this.lbwPresetsMap[loraType][sdVersion] = lbwPreset;
                this.lbwPresetsValueKeyMap[loraType][sdVersion] = lbwPresetValueKey;

                const blockLength = this.#getLbwWeightSetting(loraType, sdVersion).masks.filter((b) => b == 1).length;
                for (const line of lbwPresets) {
                    const kv = line.split(":");
                    if (kv.length == 2 && kv[1].split(",").length == blockLength) {
                        lbwPreset[kv[0]] = kv[1];
                        lbwPresetValueKey[kv[1]] = kv[0];
                    }
                }
            }
        }

        this.weightData.VERSION = VERSION;

        for (const weightType of Object.keys(this.WEIGHT_SETTINGS)) {
            this.weightData[weightType] = []
            this.weightData[weightType].push(this.WEIGHT_SETTINGS[weightType].default);
        }
        this.weightData.lbw = [];
        this.weightData.lbwe = [];
        this.weightData.special = "";

        const keyTypes = ["te", "unet", "dyn"];
        const lbwBlocks = this.multiplier.split(":");

        let assumedSdVersion = null;
        let assumedLoraType = null;
        for (let i = 0; i < lbwBlocks.length; i++) {
            let lbwBlock = lbwBlocks[i].split("=");
            let keyType;
            let blocks;
            if (lbwBlock.length > 1) {
                keyType = lbwBlock[0].toLowerCase();
                blocks = lbwBlock[1];
            } else {
                keyType = keyTypes[i];
                blocks = lbwBlock[0];
            }
            if (keyType === "lbw") {
                blocks = lbwBlock[1].split(',');

                const setLbwBlocks = (loraType, sdVersion) => {
                    const specialPresets = this.#getLbwSpecialPreset(loraType, sdVersion);
                    if (blocks.length === 1) {
                        if (specialPresets.some(s => Object.values(s)[0] === blocks[0])) {
                            this.weightData.special = blocks[0];
                        }
                    }
                    if (blocks.length === 1) {
                        const lbwPresets = this.#getLbwPresets(loraType, sdVersion);
                        if (blocks in lbwPresets) {
                            blocks = lbwPresets[blocks].split(',');
                        }
                    }
                    if (blocks.length === 1) {
                        return false;
                    }
                    const masks = this.#getLbwWeightSetting(loraType, sdVersion).masks;
                    if (blocks.length === masks.filter((b) => b == 1).length) {
                        assumedSdVersion = sdVersion;
                        assumedLoraType = loraType;
                        let refIdx = 0;
                        for (let enable of masks) {
                            if (enable) {
                                this.weightData.lbw.push(parseInt(blocks[refIdx] * 100));
                                refIdx++;
                            } else {
                                this.weightData.lbw.push(0);
                            }
                        }
                        return true;
                    }
                }
                (() => {
                    for (const loraType of Object.values(WeightHelper.LORA_TYPE_PULLDOWN)) {
                        for (const sdVersion of WeightHelper.LBW_WEIGHT_SD_VERSIONS) {
                            if (setLbwBlocks(loraType, sdVersion)) {
                                return;
                            }
                        }
                    }
                })();

            } else if (keyType === "step") {
                const startStop = blocks.split('-');
                this.weightData.start[0] = parseInt(startStop[0]) * 100;
                this.weightData.stop[0] = parseInt(startStop[1]) * 100;
            } else if (keyType === "lbwe") {
                this.weightData[keyType][0] = blocks;
            } else {
                this.weightData[keyType][0] = parseInt(blocks * 100);
            }
        }
        this.weightData.use_unet = this.weightData.unet[0] != null;
        this.weightData.use_dyn = this.weightData.dyn[0] != null;

        if (assumedLoraType) {
            this.weightData.lbw_lora_type = assumedLoraType;
        }
        if (!this.weightData.lbw_lora_type) {
            if (this.tagName === "lora") {
                this.weightData.lbw_lora_type = "lora";
            } else {
                this.weightData.lbw_lora_type = "lycoris";
            }
        }
        if (assumedSdVersion) {
            this.weightData.lbw_sd_version = assumedSdVersion;
        }
        if (!this.weightData.lbw_sd_version) {
            this.weightData.lbw_sd_version = this.metadata.sd_version;
        }

        const masks = this.#getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
        this.weightData.masks = masks;
        if (!this.weightData.lbw.length) {
            for (let _ of masks) {
                this.weightData.lbw.push(100);
            }
        }

        if (!("bookmark" in weight_helper_data[this.nameHash])) {
            weight_helper_data[this.nameHash].bookmark = [];
        }
        weight_helper_data[this.nameHash].bookmark.forEach(bookmark => {
            this.currentBookmarkSet.add(bookmark.hashCode(), bookmark);
        });

        if (!("history" in weight_helper_data[this.nameHash])) {
            weight_helper_data[this.nameHash].history = [];
        }
        this.currentHistory = weight_helper_data[this.nameHash].history;
        if (this.currentHistory.length == 0) {
            this.currentHistory.push(this.weightData.clone());
        } else {
            const historyLen = this.currentHistory.length;
            const latestHistory = this.currentHistory[historyLen - 1];
            if (!this.weightData.equals(latestHistory)) {
                this.currentHistory.push(this.weightData.clone());
            }
        }
        this.historyIndex = this.currentHistory.length - 1;

        this.#makeContextMenuHeader();
        this.#makeContextMenuBody();
        this.#makeLbwGroupWrapper();
    }

    #makeContextMenuHeader() {
        this.domCustomContextMenu = document.createElement('div');
        this.domCustomContextMenu.id = 'weight-helper';
        this.#bind(this.domCustomContextMenu, "click", (e) => e.stopPropagation());

        let scale = opts.weight_helper_context_menu_scale;
        if (scale <= 0) {
            scale = 1;
        }
        this.domCustomContextMenu.style.transform = `scale(${scale})`;

        const header = document.createElement('header');
        this.#bind(header, "mousedown", (e) => {
            this.isDragging = true;
            this.offsetX = e.clientX - this.domCustomContextMenu.getBoundingClientRect().left;
            this.offsetY = e.clientY - this.domCustomContextMenu.getBoundingClientRect().top;
        });

        const headerTitle = document.createElement('span');
        header.appendChild(headerTitle);

        const weightDataHash = this.weightData.hashCode();
        const isBookmarked = this.currentBookmarkSet.has(weightDataHash);

        const bookmarkIcon = document.createElement('span');
        bookmarkIcon.className = "svg";
        bookmarkIcon.innerHTML = WeightHelper.SVG_LOCK;
        bookmarkIcon.className = `bookmark ${isBookmarked ? "like" : "unlike"}`;
        if (this.weightData.isSpecial() || !this.weightData.lbw_lora_type || !this.weightData.lbw_sd_version) {
            bookmarkIcon.style.visibility = "hidden";
        }
        headerTitle.prepend(bookmarkIcon);
        this.#bind(bookmarkIcon, "click", () => {
            const weightDataHash = this.weightData.hashCode();
            const isBookmarked = this.currentBookmarkSet.has(weightDataHash);

            this.#updateBookmarkedIcon(!isBookmarked);
            if (isBookmarked) {
                this.currentBookmarkSet.delete(weightDataHash);
            } else {
                const weightDataClone = this.weightData.clone();
                if (weightDataClone.stop[0] == this.WEIGHT_SETTINGS.stop.default) {
                    weightDataClone.stop[0] = null;
                }
                this.currentBookmarkSet.add(weightDataHash, weightDataClone);
            }
        });

        const headerLabel = document.createElement('label');
        headerLabel.className = "name";
        headerLabel.textContent = this.name;
        headerTitle.appendChild(headerLabel);

        const history = document.createElement('div');
        history.className = "history";
        header.appendChild(history);

        const clear = document.createElement('a');
        clear.className = "icon";
        clear.textContent = "clear";
        clear.addEventListener("click", () => {
            const newHistory = this.currentBookmarkSet.getAll();
            if (newHistory.length == 0 || !newHistory[newHistory.length - 1].equals(this.weightData)) {
                newHistory.push(this.weightData);
            }

            weight_helper_data[this.nameHash].history = newHistory;
            this.currentHistory = newHistory;

            pageLabel.textContent = `${newHistory.length}/${newHistory.length}`;
            this.historyIndex = newHistory.length - 1;
        });
        history.appendChild(clear);

        const pageWrapper = document.createElement('div');
        pageWrapper.className = "page";
        history.appendChild(pageWrapper);

        const pageLabel = document.createElement('label');
        pageLabel.className = "page-label";
        pageLabel.textContent = (this.historyIndex + 1) + "/" + this.currentHistory.length;

        const pageLeft = document.createElement('a');
        pageLeft.textContent = "<";
        pageLeft.className = "icon";
        pageWrapper.appendChild(pageLeft);
        this.#bind(pageLeft, "click", () => {
            if (this.historyIndex <= 0) {
                return;
            }
            this.historyIndex--;
            this.#restoreFromHistory();
        });

        pageWrapper.appendChild(pageLabel);

        const pageRight = document.createElement('a');
        pageRight.textContent = ">";
        pageRight.className = "icon";
        pageWrapper.appendChild(pageRight);
        this.#bind(pageRight, "click", () => {
            if (this.historyIndex >= this.currentHistory.length - 1) {
                return;
            }
            this.historyIndex++;
            this.#restoreFromHistory();
        });

        this.domCustomContextMenu.appendChild(header);

        this.#bind(document.body, "mousemove", (e) => {
            if (!this.isDragging) return;

            const x = e.clientX - this.offsetX + window.scrollX;
            const y = e.clientY - this.offsetY + window.scrollY;

            this.domCustomContextMenu.style.left = x + 'px';
            this.domCustomContextMenu.style.top = y + 'px';
        });

        this.#bind(document.body, "mouseup", () => {
            this.isDragging = false;
        });
    }

    #makeContextMenuBody() {
        const metadata = document.createElement("span");
        metadata.className = "metadata";

        const loraInfoType = document.createElement("span");
        metadata.appendChild(loraInfoType);
        const typeLabel = document.createElement("span");
        typeLabel.innerText = "Alg:"
        loraInfoType.appendChild(typeLabel);
        const typeVal = document.createElement("span");
        typeVal.className = "metadata__alg";
        typeVal.innerText = "-----";
        loraInfoType.appendChild(typeVal);

        const loraInfoSdVer = document.createElement("span");
        metadata.appendChild(loraInfoSdVer);
        const sdVerLabel = document.createElement("span");
        sdVerLabel.innerText = "SD Ver:";
        loraInfoSdVer.appendChild(sdVerLabel);
        const sdVerVal = document.createElement("span");
        sdVerVal.className = "metadata__sdver"
        sdVerVal.innerText = "-----";
        loraInfoSdVer.appendChild(sdVerVal);

        const reload = document.createElement("a");
        reload.className = "icon mini svg";
        reload.innerHTML = WeightHelper.SVG_RELOAD;
        metadata.appendChild(reload);
        reload.addEventListener("click", () => {
            this.#loadMetadata(true);
        });

        this.domCustomContextMenu.appendChild(metadata);

        const extraOpts = [];
        let hiddenExtraOpts = 0;
        for (const group of Object.keys(this.WEIGHT_SETTINGS)) {
            if (group == "lbw") {
                break;
            }

            const weightSetting = this.WEIGHT_SETTINGS[group];

            this.weightUIs[group] = {slider: [], updown: []};

            const section = document.createElement('section');
            section.className = "border";

            const labelContainer = document.createElement("span");
            const label = document.createElement('label');
            label.textContent = weightSetting.label;
            labelContainer.appendChild(label);
            section.appendChild(labelContainer);
            section.appendChild(this.#makeSliderComponent(labelContainer, null, group, 0));

            if (weightSetting.label === "TEnc") {
                this.domCustomContextMenu.appendChild(section);
            } else {
                extraOpts.push(section);
                const defVal = this.WEIGHT_SETTINGS[group].default;
                const weightUI = this.weightUIs[group];
                if ("use_check" in weightUI && !weightUI.use_check.checked ||
                        defVal !== undefined && this.weightData[group][0] === defVal) {
                    section.style.display = 'none';
                    hiddenExtraOpts++;
                }
                this.domCustomContextMenu.appendChild(section);
            }
        }

        if (hiddenExtraOpts > 0) {
            const extraButton = document.createElement('button');
            extraButton.className = "secondary gradio-button";
            extraButton.id = "weight-helper-show-extra-opt-button";
            extraButton.textContent = "show extra options";
            this.#bind(extraButton, "click", (e) => {
                e.target.remove();
                for (const extra of extraOpts) {
                    extra.style.display = '';
                }
                this.openedExtraOption = true;
            });
            this.domCustomContextMenu.appendChild(extraButton);
        }

        const group = "lbw";

        this.weightUIs[group] = {slider: [], updown: [], dom: []};

        const lbwSection = document.createElement('section');
        lbwSection.className = "border";

        const label = document.createElement('label');
        label.textContent = group.toUpperCase();
        lbwSection.appendChild(label);

        const lbwSet = document.createElement('div');
        lbwSet.className = 'f col g-4 w-fill';
        lbwSection.appendChild(lbwSet);

        const typeRow = document.createElement("div");
        typeRow.className = "f g-2 f-end";

        const loraTypeSelect = document.createElement("select");
        loraTypeSelect.className = "select-lora";
        loraTypeSelect.style.flexGrow = 1;
        for (const entry of Object.entries(WeightHelper.LORA_TYPE_PULLDOWN)) {
            const lbwTagOpt = document.createElement('option');
            lbwTagOpt.text = entry[0];
            lbwTagOpt.value = entry[1];
            loraTypeSelect.appendChild(lbwTagOpt);
        }
        loraTypeSelect.value = this.weightData.lbw_lora_type;

        const bookmarkIcon = this.domCustomContextMenu.querySelector(".bookmark");
        this.#bind(loraTypeSelect, "change", (e) => {
            this.weightData.lbw_lora_type = e.target.value;
            this.#makeLbwGroupWrapper();
            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText();
                this.#update(updatedText);
            }
            const sdVersion = this.weightData.lbw_sd_version;
            const masks = this.#getLbwWeightSetting(e.target.value, sdVersion).masks;
            this.weightData.masks = masks;
            if (sdVersion && !this.weightData.special) {
                bookmarkIcon.style.visibility = "";
                const isBookmarked = this.currentBookmarkSet.has(this.weightData.hashCode());
                this.#updateBookmarkedIcon(isBookmarked);
            }
        });
        typeRow.appendChild(loraTypeSelect);

        const typeTypeRow = document.createElement("div");
        typeTypeRow.className = "border f g-2 f-end";

        const typeType = document.createElement("div");
        typeType.className = "f g-2 f-end";
        for (const sdVersion of WeightHelper.LBW_WEIGHT_SD_VERSIONS) {
            const sdVersionRadio = document.createElement("input");
            const radioId = "weight-helper__sd-version_" + sdVersion;
            sdVersionRadio.id = radioId;
            sdVersionRadio.className = "sd-version";
            sdVersionRadio.type = "radio";
            sdVersionRadio.name = "sd-version";
            sdVersionRadio.value = sdVersion;
            sdVersionRadio.checked = sdVersion == this.weightData.lbw_sd_version;
            this.#bind(sdVersionRadio, "change", (e) => {
                this.weightData.lbw_sd_version = e.target.value;
                this.#makeLbwGroupWrapper();
                if (!this.usingExecCommand) {
                    const updatedText = this.#getUpdatedText();
                    this.#update(updatedText);
                }
                const loraType = this.weightData.lbw_lora_type;
                const masks = this.#getLbwWeightSetting(loraType, e.target.value).masks;
                this.weightData.masks = masks;
                if (loraType && !this.weightData.special) {
                    bookmarkIcon.style.visibility = "";
                    const isBookmarked = this.currentBookmarkSet.has(this.weightData.hashCode());
                    this.#updateBookmarkedIcon(isBookmarked);
                }
            });
            typeType.appendChild(sdVersionRadio);

            const sdVersionLabel = document.createElement("label");
            sdVersionLabel.className = "radio-label";
            sdVersionLabel.textContent = sdVersion;
            sdVersionLabel.htmlFor = radioId;
            typeType.appendChild(sdVersionLabel);
        }
        typeTypeRow.appendChild(typeType);

        typeRow.appendChild(typeTypeRow);
        lbwSet.appendChild(typeRow);

        const domPresetSelect = document.createElement('select');
        domPresetSelect.className = "preset-select";
        lbwSet.appendChild(domPresetSelect);

        const domLbwGroupWrapper = document.createElement("div");
        domLbwGroupWrapper.className = 'lbw-group-wrapper f col g-2';
        domLbwGroupWrapper.style.display = this.weightData.special ? "none" : "flex";
        this.#bind(domPresetSelect, "change", (e) => {
            const selectVal = e.target.value;
            const specialPresets = this.#getLbwSpecialPreset(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version);
            const isSpecial = specialPresets.some(s => Object.values(s)[0] === selectVal);
            const bookmarkIcon = this.domCustomContextMenu.querySelector(".bookmark");
            if (isSpecial) {
                this.weightData.special = selectVal;
                domLbwGroupWrapper.style.display = "none";
                bookmarkIcon.style.visibility = "hidden";
            } else {
                this.weightData.special = "";
                domLbwGroupWrapper.style.display = "flex";
                if (this.weightData.lbw_lora_type && this.weightData.lbw_sd_version) {
                    bookmarkIcon.style.visibility = "";
                }

                const masks = this.#getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
                let values;
                if (selectVal === "") {
                    values = [];
                    for (let idx = 0; idx < masks.length; idx++) {
                        if (masks[idx] === 1) {
                            const val = this.weightData.lbw[idx];
                            values.push(val);
                        }
                    }
                } else {
                    values = selectVal.split(",").map(v => Math.round(parseFloat(v) * 100));
                }
                let refIdx = 0;
                for (let idx = 0; idx < masks.length; idx++) {
                    let val = 0;
                    if (masks[idx] === 1) {
                        val = values[refIdx];
                        refIdx++;
                    }
                    this.weightData[group][idx] = val;
                    this.weightUIs[group].slider[idx].value = val;
                    this.weightUIs[group].updown[idx].value = val / 100;
                }

                const weightDataHash = this.weightData.hashCode();
                const isBookmarked = this.currentBookmarkSet.has(weightDataHash);
                this.#updateBookmarkedIcon(isBookmarked);
            }

            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText();
                this.#update(updatedText);
            }
        });

        for (let idx = 0; idx < this.weightData[group].length; idx++) {
            let lbwUnit = document.createElement('div');
            lbwUnit.className = `lbw-unit lbw-u-${idx}`;
            lbwUnit.className = 'f g-2';

            const label = document.createElement('label');
            label.textContent = this.WEIGHT_SETTINGS[group].labels[idx];
            lbwUnit.appendChild(label);
            lbwUnit.appendChild(this.#makeSliderComponent(null, domPresetSelect, group, idx));

            this.weightUIs.lbw.dom.push(lbwUnit);
        }

        lbwSet.appendChild(domLbwGroupWrapper);
        this.domCustomContextMenu.appendChild(lbwSection);
    }

    #makeLbwGroupWrapper() {
        const domPresetSelect = this.domCustomContextMenu.querySelector(".preset-select");
        while (domPresetSelect.firstChild) {
            domPresetSelect.removeChild(domPresetSelect.firstChild);
        }
        const opt = document.createElement('option');
        opt.value = "";
        opt.text = "";
        domPresetSelect.appendChild(opt);

        const specialPresets = this.#getLbwSpecialPreset(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version);
        for (const sp of specialPresets) {
            for (const spEntry of Object.entries(sp)) {
                const spOpt = document.createElement('option');
                spOpt.text = spEntry[0];
                spOpt.value = spEntry[1];
                domPresetSelect.appendChild(spOpt);
            }
        }

        let loraType = this.weightData.lbw_lora_type;
        let sdVersion = this.weightData.lbw_sd_version;

        if (sdVersion && loraType) {
            if (Object.keys(this.#getLbwPresets(loraType, sdVersion)).length) {
                const lbwPresets = this.#getLbwPresets(loraType, sdVersion);
                for (const key of Object.keys(lbwPresets)) {
                    const opt = document.createElement('option');
                    opt.text = key;
                    opt.value = lbwPresets[key];
                    domPresetSelect.appendChild(opt);
                }
            }
        }
        domPresetSelect.value = this.#getLbwWeightData();

        const domLbwGroupWrapper = this.domCustomContextMenu.querySelector(".lbw-group-wrapper");
        while (domLbwGroupWrapper.firstChild) {
            domLbwGroupWrapper.removeChild(domLbwGroupWrapper.firstChild);
        }

        const lbwWeightSetting = this.#getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version);

        const labelMap = {};
        for (let idx = 0; idx < this.WEIGHT_SETTINGS.lbw.labels.length; idx++) {
            labelMap[this.WEIGHT_SETTINGS.lbw.labels[idx]] = idx;
        }
        for (const blockPoint of lbwWeightSetting.block_points) {
            const points = blockPoint.split("-");
            let pointStart = labelMap[points[0]];
            let pointEnd = pointStart;
            if (points.length > 1) {
                pointEnd = labelMap[points[1]];
            }
            const lbwGroup = document.createElement('div');
            lbwGroup.className = 'border f g-2 col';
            for (let idx = pointStart; idx <= pointEnd; idx++) {
                if (lbwWeightSetting.masks[idx] == 1) {
                    lbwGroup.appendChild(this.weightUIs.lbw.dom[idx]);
                }
            }
            domLbwGroupWrapper.appendChild(lbwGroup);
        }
    }

    #makeSlider(group, i) {
        const value = Math.round(this.weightData[group][i]);
        const min = this.WEIGHT_SETTINGS[group].min;
        const max = this.WEIGHT_SETTINGS[group].max;
        const step = this.WEIGHT_SETTINGS[group].step;
        const slider = document.createElement('input');
        slider.className = 'slider';
        slider.type = 'range';
        if (group == "start" || group == "stop") {
            slider.min = min;
            slider.max = max;
        } else {
            slider.min = value < min ? value : min;
            slider.max = value > max ? value : max;
        }
        slider.step = step;
        slider.value = value;
        return slider;
    }

    #makeUpdown(group, i) {
        const value = this.weightData[group][i];
        const step = this.WEIGHT_SETTINGS[group].step;
        const valueText = document.createElement('input');
        valueText.className = 'value';
        valueText.type = "number";
        valueText.step = parseFloat(step) / 100;
        valueText.value = value / 100;
        return valueText;
    }

    #makeSliderComponent(labelContainer, lbwPresetSelect, group, i) {
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'f f-c g-4';

        if (labelContainer && this.WEIGHT_SETTINGS[group].default === undefined) {
            const unetVal = this.weightData[group][i];
            const useCheck = document.createElement('input');
            this.#bind(useCheck, "change", (e) => {
                this.weightData[`use_${group}`] = e.target.checked;

                const weightDataHash = this.weightData.hashCode();
                const isBookmarked = this.currentBookmarkSet.has(weightDataHash);
                this.#updateBookmarkedIcon(isBookmarked);

                if (!this.usingExecCommand) {
                    const updatedText = this.#getUpdatedText();
                    this.#update(updatedText);
                }
            });
            useCheck.type = "checkbox";
            if (unetVal != null) {
                useCheck.checked = true;
            } else {
                this.weightData[group][i] = 0;
            }
            this.weightUIs[group].use_check = useCheck;
            labelContainer.appendChild(useCheck);
        }

        const slider = this.#makeSlider(group, i);
        this.weightUIs[group].slider.push(slider);
        sliderContainer.appendChild(slider);

        const updown = this.#makeUpdown(group, i);
        this.weightUIs[group].updown.push(updown);
        sliderContainer.appendChild(updown);

        const changedLbwValues = () => {
            let lbwValues = null;
            const loraType = this.weightData.lbw_lora_type;
            const sdVersion = this.weightData.lbw_sd_version;
            if (lbwPresetSelect && group === "lbw" && loraType && sdVersion) {
                this.weightData.special = "";
                lbwValues = this.#getLbwWeightData().join(",");
                if (lbwValues in this.lbwPresetsValueKeyMap[loraType][sdVersion]) {
                    lbwPresetSelect.value = lbwValues;
                } else {
                    lbwPresetSelect.selectedIndex = 0;
                }
            }
            if ("use_check" in this.weightUIs[group]) {
                const useCheck = this.weightUIs[group].use_check;
                if (!useCheck.checked) {
                    useCheck.checked = true;
                    this.weightData[`use_${group}`] = true;
                }
            }

            const weightDataHash = this.weightData.hashCode();
            const isBookmarked = this.currentBookmarkSet.has(weightDataHash);
            this.#updateBookmarkedIcon(isBookmarked);

            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText();
                this.#update(updatedText);
            }
        }

        this.#bind(slider, "input", (e) => {
            const fVal = parseFloat(e.target.value);
            this.weightData[group][i] = fVal;
            updown.value = Math.round(fVal) / 100;
            changedLbwValues();
        });
        this.#bind(updown, "input", (e) => {
            const fVal = parseFloat(e.target.value);
            this.weightData[group][i] = fVal * 100;
            slider.value = Math.round(fVal * 100);
            changedLbwValues();
        });
        return sliderContainer;
    }

    #restoreFromHistory() {
        const pageLabel = this.domCustomContextMenu.querySelector(".page-label");
        pageLabel.textContent = (this.historyIndex + 1) + "/" + this.currentHistory.length;
        const oldLbwLoraType = this.weightData.lbw_lora_type;
        const oldSdVersion = this.weightData.lbw_sd_version;
        this.weightData = this.currentHistory[this.historyIndex].clone();

        const bookmarkIcon = this.domCustomContextMenu.querySelector(".bookmark");
        bookmarkIcon.style.visibility = this.weightData.isSpecial() ? "hidden" : "";

        Object.keys(this.weightData).map(key => {
            if (["VERSION"].includes(key)) {
                return;
            }
            if (["stop"].includes(key)) {
                if (this.weightData[key][0] == null) {
                    this.weightData[key][0] = this.WEIGHT_SETTINGS[key].default;
                }
            }
            for (const idx in this.weightData[key]) {
                let fVal = this.weightData[key][idx];
                if (key in this.weightUIs) {
                    let isExtraType = false;
                    let show = false;
                    if (["unet", "dyn"].includes(key)) {
                        isExtraType = true;
                        const useCheck = this.weightData[`use_${key}`];
                        this.weightUIs[key].use_check.checked = useCheck;
                        show = useCheck;
                    }
                    if (["start", "stop"].includes(key)) {
                        isExtraType = true;
                        let val = this.weightData[key];
                        if (val[0] != null && val[0] != this.WEIGHT_SETTINGS[key].default) {
                            show = true;
                        }
                    }
                    if (!this.openedExtraOption && isExtraType) {
                        const parent = this.weightUIs[key].slider[0].closest("section");
                        parent.style.display = show ? "flex" : "none";
                    }
                    if (fVal == null) {
                        fVal = 0;
                    }
                    this.weightUIs[key].slider[idx].value = fVal;
                    this.weightUIs[key].updown[idx].value = fVal / 100;
                }
            }
        });

        if (oldLbwLoraType !== this.weightData.lbw_lora_type || oldSdVersion !== this.weightData.lbw_sd_version) {
            const loraTypeSelect = this.domCustomContextMenu.querySelector(".select-lora");
            loraTypeSelect.value = this.weightData.lbw_lora_type;
            const sdVersionRadios = this.domCustomContextMenu.querySelectorAll(".sd-version");
            sdVersionRadios.forEach((radio) => {
                radio.checked = radio.value === this.weightData.lbw_sd_version;
            });
            this.#makeLbwGroupWrapper();
        } else {
            const domPresetSelect = this.domCustomContextMenu.querySelector(".preset-select");
            if (this.weightData.special) {
                domPresetSelect.value = this.weightData.special;
            } else {
                const lbwValues = this.#getLbwWeightData().join(",");
                if (lbwValues in this.lbwPresetsValueKeyMap[this.weightData.lbw_lora_type][this.weightData.lbw_sd_version]) {
                    domPresetSelect.value = lbwValues;
                } else {
                    domPresetSelect.selectedIndex = 0;
                }
            }
        }
        const domLbwGroupWrapper = this.domCustomContextMenu.querySelector(".lbw-group-wrapper");
        domLbwGroupWrapper.style.display = this.weightData.special ? "none" : "flex";

        if (!this.usingExecCommand) {
            const updatedText = this.#getUpdatedText();
            this.#update(updatedText);
        }

        const weightDataHash = this.weightData.hashCode();
        const isBookmarked = this.currentBookmarkSet.has(weightDataHash);
        this.#updateBookmarkedIcon(isBookmarked);
    }

    #getLbwWeightData() {
        if (this.weightData.special) {
            return this.weightData.special;
        }
        const masks = this.#getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
        return this.weightData.lbw.filter((_, i) => masks[i] === 1).map(v => v / 100);
    }

    #getLbwPresets(loraType, sdVersion) {
        if (loraType && sdVersion) {
            if (loraType in this.lbwPresetsMap) {
                if (sdVersion in this.lbwPresetsMap[loraType]) {
                    return this.lbwPresetsMap[loraType][sdVersion]
                }
            }
        }
        return {};
    }

    #getLbwWeightSetting(loraType, sdVersion) {
        if (loraType && sdVersion) {
            if (loraType in WeightHelper.LBW_WEIGHT_SETTINGS) {
                if (sdVersion in WeightHelper.LBW_WEIGHT_SETTINGS[loraType]) {
                    return WeightHelper.LBW_WEIGHT_SETTINGS[loraType][sdVersion]
                }
            }
        }
        return WeightHelper.LBW_WEIGHT_SETTINGS["unknown"];
    }

    #getLbwSpecialPreset(loraType, sdVersion) {
        if (loraType && sdVersion) {
            if (loraType in WeightHelper.SPECIAL_PRESETS) {
                if (sdVersion in WeightHelper.SPECIAL_PRESETS[loraType]) {
                    return WeightHelper.SPECIAL_PRESETS[loraType][sdVersion];
                }
            }
        }
        return WeightHelper.SPECIAL_PRESETS["unknown"];
    }

    #updateBookmarkedIcon(isBookmarked) {
        const bookmarkIcon = this.domCustomContextMenu.querySelector(".bookmark");
        if (isBookmarked) {
            bookmarkIcon.className = "bookmark like";
        } else {
            bookmarkIcon.className = "bookmark unlike";
        }
    }

    #getUpdatedText() {
        let updatedText = `<${this.tagName}:${this.name}`;
        const optionalTypes = ["te", "unet", "dyn"];
        let refIdx = 0;
        for (let idx = 0; idx < optionalTypes.length; idx++) {
            const keyType = optionalTypes[idx];
            if (keyType in this.weightData) {
                const defVal = this.WEIGHT_SETTINGS[keyType].default;
                const val = this.weightData[keyType];
                let output = false;
                if (keyType === "te") {
                    output = true;
                } else if ("use_check" in this.weightUIs[keyType]) {
                    if (this.weightUIs[keyType].use_check.checked) {
                        output = true;
                    }
                } else if (val != defVal) {
                    output = true;
                }
                if (output) {
                    let rateValue = val / 100;
                    if (idx === refIdx) {
                        updatedText += `:${rateValue}`;
                    } else {
                        updatedText += `:${keyType}=${rateValue}`;
                    }
                    refIdx++;
                }
            }
        }
        const startDefVal = this.WEIGHT_SETTINGS.start.default;
        const startVal = this.weightData.start;
        const stopDefVal = this.WEIGHT_SETTINGS.stop.default;
        const stopVal = this.weightData.stop;
        if (startVal != startDefVal && stopVal != stopDefVal) {
            updatedText += `:step=${startVal / 100}-${stopVal / 100}`;
        } else if (startVal != startDefVal) {
            updatedText += `:start=${startVal / 100}`;
        } else if (stopVal != stopDefVal) {
            updatedText += `:stop=${stopVal / 100}`;
        }

        let lbwWeights = [];
        const masks = this.#getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
        for (let idx = 0; idx < masks.length; idx++) {
            if (masks[idx]) {
                lbwWeights.push(this.weightData.lbw[idx]);
            }
        }
        if (!this.weightData.special) {
            if (!lbwWeights.every(val => val === this.WEIGHT_SETTINGS.lbw.default)) {
                let rateValues = lbwWeights.map(v => v / 100).join(",");
                const lbwValues = this.#getLbwWeightData().join(",");

                let loraType = this.weightData.lbw_lora_type;
                let sdVersion = this.weightData.lbw_sd_version;
                if (loraType && sdVersion) {
                    if (lbwValues in this.lbwPresetsValueKeyMap[loraType][sdVersion]) {
                        rateValues = this.lbwPresetsValueKeyMap[loraType][sdVersion][lbwValues];
                    }
                }
                updatedText += `:lbw=${rateValues}`;
            }
        } else {
            updatedText += `:lbw=${this.weightData.special}`;
        }
        if (this.weightData.lbwe.length > 0) {
            updatedText += `:lbwe=${this.weightData.lbwe[0]}`;
        }
        updatedText += ">";
        return updatedText;
    }

    #update(updatedText) {
        this.textarea.value = this.textarea.value.substring(0, this.lastSelectionStart) + updatedText + this.textarea.value.substring(this.lastSelectionEnd);
        this.lastSelectionEnd = this.lastSelectionStart + updatedText.length;
    }

    #updateWithExecCommand(updatedText) {
        this.#withoutTAC(() => {
            this.textarea.focus();
            this.textarea.setSelectionRange(this.lastSelectionStart, this.lastSelectionEnd);
            document.execCommand("insertText", false, updatedText);
        });
    }

    #doSave() {
        const loraInfo = weight_helper_data[this.nameHash].lora_info;
        loraInfo.metadata = this.metadata;
        loraInfo.selected_lora_type.lbw_lora_type = this.weightData.lbw_lora_type;
        loraInfo.selected_lora_type.lbw_sd_version = this.weightData.lbw_sd_version;

        const lbwDefault = this.WEIGHT_SETTINGS.lbw.default;
        const masks = this.#getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
        for (let idx = 0; idx < masks.length; idx++) {
            if (masks[idx] !== 1) {
                this.weightData.lbw[idx] = lbwDefault;
            }
        }

        if (this.weightData.lbw_lora_type && this.weightData.lbw_sd_version) {
            const historyLen = this.currentHistory.length;
            let lastWeightData = this.currentHistory.at(-1);
            let historyChanged = false;
            if (this.historyIndex == historyLen - 1) {
                historyChanged = !this.weightData.equals(lastWeightData);
                if (historyChanged) {
                    this.currentHistory.push(this.weightData);
                }
            } else {
                this.currentHistory.splice(this.historyIndex, 1);
                this.currentHistory.push(this.weightData);
            }
            if (this.weightData.stop[0] == this.WEIGHT_SETTINGS.stop.default) {
                this.weightData.stop[0] = null;
            }
            weight_helper_data[this.nameHash].bookmark = this.currentBookmarkSet.getAll();
        }
        localStorage.setItem("weight_helper_data", JSON.stringify(weight_helper_data));
    }

    async #loadMetadata(force = false) {
        const domMetadata = this.domCustomContextMenu.getElementsByClassName("metadata")[0];
        const typeVal = domMetadata.getElementsByClassName("metadata__alg")[0];
        const sdVerVal = domMetadata.getElementsByClassName("metadata__sdver")[0];
        if (force) {
            domMetadata.classList.remove("error");
            typeVal.innerText = "-----";
            sdVerVal.innerText = "-----";
        }
        if (force || Object.keys(this.metadata).length == 0) {
            const key = encodeURIComponent(this.name);
            this.metadata = await this.#postAPI(`/whapi/v1/get_metadata?key=${key}`, null) ?? {};
        }
        if (Object.keys(this.metadata).length > 0) {
            if (this.metadata.sd_version && !this.weightData.lbw_sd_version) {
                const sdVersionRadios = this.domCustomContextMenu.querySelectorAll(".sd-version");
                this.weightData.lbw_sd_version = this.metadata.sd_version === "SDXL" ? "SDXL" : "SD";
                if (this.currentHistory.length == 1) {
                    this.currentHistory[0].lbw_sd_version = this.weightData.lbw_sd_version;
                }
                let selectedRadio = undefined;
                sdVersionRadios.forEach((radio) => {
                    if (radio.value === this.weightData.lbw_sd_version) {
                        radio.checked = true;
                        selectedRadio = radio;
                    }
                });
                if (selectedRadio) {
                    selectedRadio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            typeVal.innerText = this.metadata.algorithm ?? "Unknown";
            sdVerVal.innerText = this.metadata.sd_version ?? "Unknown";
        } else {
            metadata.classList.add("error");
            typeVal.innerText = "TIMEOUT";
            sdVerVal.innerText = "TIMEOUT";
        }
    }

    async #loadPreviewInfo() {
        if (Object.keys(this.previewInfo).length == 0) {
            const key = encodeURIComponent(this.name);
            this.previewInfo = await this.#postAPI(`/whapi/v1/get_preview_info?key=${key}`, null);
        }
        if (Object.keys(this.previewInfo).length > 0) {
            const pane = document.createElement("div");
            pane.className = "preview-pane card";
            pane.dataset.name = this.previewInfo.model_name;

            const img = document.createElement("img");
            img.className = "preview";
            img.setAttribute("src", this.previewInfo.preview_url);
            pane.appendChild(img);

            const buttonTop = document.createElement("div");
            buttonTop.className = "action-row button-top";
            pane.appendChild(buttonTop);

            if (typeof extraNetworksRequestMetadata === "function" && this.previewInfo.has_metadata) {
                const metadataButton = document.createElement("div");
                metadataButton.className = "metadata-btn card-btn";
                metadataButton.setAttribute("title", "Show internal metadata");
                this.#bind(metadataButton, "click", (e) => extraNetworksRequestMetadata(e, 'lora', this.previewInfo.model_name));
                buttonTop.appendChild(metadataButton);
            }

            if (typeof extraNetworksEditUserMetadata === "function") {
                const editButton = document.createElement("div");
                editButton.className = "edit-btn card-btn";
                editButton.setAttribute("title", "Edit metadata");
                this.#bind(editButton, "click", (e) => extraNetworksEditUserMetadata(e, this.tabId, 'lora', this.previewInfo.model_name));
                buttonTop.appendChild(editButton);
            }

            if (this.previewInfo.model_id) {
                const civitaiButton = document.createElement("div");
                civitaiButton.className = "civitai-btn card-btn";
                civitaiButton.setAttribute("title", "Open civitai");
                this.#bind(civitaiButton, "click", () => window.open(`https://civitai.com/models/${this.previewInfo.model_id}`, '_blank'));
                buttonTop.appendChild(civitaiButton);
            }

            const triggerWords = this.previewInfo.trigger_words ?? [];
            const negativeTriggerWords = this.previewInfo.negative_trigger_words ?? [];
            if (triggerWords.length > 0 || negativeTriggerWords.length > 0) {
                const addTriggerButton = document.createElement("div");
                addTriggerButton.className = "add-trigger-btn card-btn";
                addTriggerButton.setAttribute("title", "Add trigger words");
                this.#bind(addTriggerButton, "click", () => {
                    let promptTextarea = document.querySelector(`#${this.tabId}_prompt textarea`);
                    let negativeTextarea = document.querySelector(`#${this.tabId}_neg_prompt textarea`);
                    if (this.textarea === negativeTextarea) {
                    } else if (this.textarea !== promptTextarea) {
                        promptTextarea = this.textarea;
                        negativeTextarea = null;
                    }
                    if (!this.usingExecCommand) {
                        if (negativeTriggerWords.length > 0 && negativeTextarea) {
                            let addNegativeWords = negativeTriggerWords.join(", ");
                            if (negativeTextarea.value) {
                                addNegativeWords = ", " + addNegativeWords;
                            }
                            negativeTextarea.value += addNegativeWords;
                        }
                        if (triggerWords.length > 0) {
                            let addPromptWords = triggerWords.join(", ");
                            if (promptTextarea.value) {
                                addPromptWords = ", " + addPromptWords;
                            }
                            promptTextarea.value += addPromptWords;
                        }
                    } else {
                        this.#withoutTAC(() => {
                            if (negativeTriggerWords.length > 0 && negativeTextarea) {
                                let addNegativeWords = negativeTriggerWords.join(", ");
                                if (negativeTextarea.value) {
                                    addNegativeWords = ", " + addNegativeWords;
                                }
                                negativeTextarea.focus();
                                const eolIndex = negativeTextarea.value.length;
                                negativeTextarea.setSelectionRange(eolIndex, eolIndex);
                                document.execCommand("insertText", false, addNegativeWords);
                            }
                            if (triggerWords.length > 0) {
                                let addPromptWords = triggerWords.join(", ");
                                if (promptTextarea.value) {
                                    addPromptWords = ", " + addPromptWords;
                                }
                                promptTextarea.focus();
                                const eolIndex = promptTextarea.value.length;
                                promptTextarea.setSelectionRange(eolIndex, eolIndex);
                                document.execCommand("insertText", false, addPromptWords);
                            }
                        });
                    }
                    addTriggerButton.remove();
                });
                buttonTop.appendChild(addTriggerButton);
            }

            if (this.previewInfo.description) {
                const buttonBottom = document.createElement("div");
                buttonBottom.className = "action-row button-bottom";
                pane.appendChild(buttonBottom);

                const actNote = document.createElement("div");
                actNote.className = "card-btn note-btn";
                this.#bind(actNote, "click", () => {
                    buttonTop.style.visibility = "hidden";
                    buttonBottom.style.visibility = "hidden";
                    actDesc.style.visibility = "visible";
                    actDescClose.style.visibility = "visible";
                });
                buttonBottom.appendChild(actNote);

                const actDesc = document.createElement("textarea");
                actDesc.className = "description";
                actDesc.textContent = this.previewInfo.description;
                pane.appendChild(actDesc);

                const actDescClose = document.createElement("div");
                actDescClose.className = "card-btn description-close-btn";
                this.#bind(actDescClose, "click", () => {
                    buttonTop.style.visibility = "";
                    buttonBottom.style.visibility = "";
                    actDesc.style.visibility = "";
                    actDescClose.style.visibility = "";
                });
                pane.appendChild(actDescClose);
            }

            img.style.height = opts.weight_helper_preview_height + "px";
            switch (opts.weight_helper_preview_position) {
                case "Bottom Right":
                    pane.style.bottom = "0px";
                    pane.style.left = String(this.domCustomContextMenu.clientWidth + 6) + "px";
                    break;
                case "Top Left":
                    pane.style.top = "0px"
                    pane.style.right = String(this.domCustomContextMenu.clientWidth + 6) + "px";
                    break;
                case "Bottom Left":
                    pane.style.bottom = "0px";
                    pane.style.right = String(this.domCustomContextMenu.clientWidth + 6) + "px";
                    break;
                default:
                    pane.style.top = "0px"
                    pane.style.left = String(this.domCustomContextMenu.clientWidth + 6) + "px";
                    break;
            }
            this.domCustomContextMenu.prepend(pane);
        }
    }

    #bind(dom, eventName, func) {
        dom.addEventListener(eventName, func);
        this.releaseFunctions.push(() => dom.removeEventListener(eventName, func));
    }

    async #postAPI(url, body) {
        let response = await fetch(url, { method: "POST", body: body });
        if (response.status != 200) {
            console.error(`Error posting to API endpoint "${url}": ` + response.status, response.statusText);
            return null;
        }
        return await response.json();
    }

    show(top, left) {
        this.domCustomContextMenu.style.top = top + 'px';
        this.domCustomContextMenu.style.left = left + 'px';
        document.body.appendChild(this.domCustomContextMenu);
        const diffBottom = window.innerHeight - this.domCustomContextMenu.getBoundingClientRect().bottom;
        if (diffBottom < 0) {
            this.domCustomContextMenu.style.top = (top + diffBottom) + 'px';
            const diffTop = this.domCustomContextMenu.getBoundingClientRect().top;
            if (diffTop < 0) {
                this.domCustomContextMenu.style.top = window.scrollY + 'px';
            }
        }
        this.#bind(document.body, "click", this.close);
        this.#bind(document.body, "keyup", this.cancel);
        WeightHelper.last_instance = this;

        this.#loadMetadata();

        if (opts.weight_helper_show_preview) {
            this.#loadPreviewInfo();
        }
    }

    close = (e) => {
        if (!this.domCustomContextMenu) return;

        if (e) {
            if (this.domCustomContextMenu.contains(e.target)) return;

            if (e.target.id === `${this.tabId}_token_button`) return;
            if (e.target.id === `${this.tabId}_lora_edit_user_metadata_button`) return;
            if (e.target.className === "global-popup-close") return;

            if (e.target.id.indexOf("_interrupt") > 0) {
                this.finally();
                return;
            }
        }

        const updatedText = this.#getUpdatedText();
        const changed = this.lastText != updatedText;
        if (changed) {
            if (!this.usingExecCommand) {
                this.textarea.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
            } else {
                this.#updateWithExecCommand(updatedText);
            }
        }
        this.#doSave();
        this.finally();
    };

    cancel = (e) => {
        if (e.key === 'Escape') {
            if (!this.usingExecCommand) {
                this.#update(this.lastText);
            }
            this.finally();
        }
    };

    finally() {
        weight_helper_preview_info[this.nameHash] = this.previewInfo;

        WeightHelper.last_instance = undefined;
        this.releaseFunctions.forEach((f) => f());
        this.domCustomContextMenu.remove();
    }

    #withoutTAC(func) {
        let tacActiveInOrg = undefined;
        const tacEnabled = typeof TAC_CFG !== 'undefined' && TAC_CFG;
        try {
            if (tacEnabled) {
                tacActiveInOrg = TAC_CFG.activeIn.global
                TAC_CFG.activeIn.global = false;
            }
            func();
        } finally {
            if (tacEnabled) {
                TAC_CFG.activeIn.global = tacActiveInOrg;
            }
        }
    }
}

function strHashCode(s) {
    let hash = 0;
    if (!s) return hash;
    for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = hash ^ char;
        hash = (hash << 5) - hash;
    }
    return hash & 0xffffffff;
}

async function onPageLoaded() {
    let tab = null;
    while (!tab) {
        tab = gradioApp().getElementById("tab_txt2img");
        if (!tab) {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
    return tab;
}

document.addEventListener('DOMContentLoaded', function() {
    const dataTemp = JSON.parse(localStorage.getItem("weight_helper_data")) ?? {};
    weight_helper_data = dataTemp;
    Object.entries(dataTemp).forEach(kv => {
        weight_helper_data[kv[0]].bookmark = kv[1].bookmark.map(v => new WeightData(v));
        weight_helper_data[kv[0]].history = kv[1].history.map(v => new WeightData(v));
    });

    onPageLoaded().then(() => {
        let textColor = getComputedStyle(document.documentElement).getPropertyValue('--body-text-color').trim();
        let textColorRgb = textColor.slice(1).match(/.{1,2}/g).map(hex => parseInt(hex, 16));
        let textColorRgba = [...textColorRgb, 0.3];
        document.documentElement.style.setProperty('--weight-helper-shadow', `rgba(${textColorRgba.join(",")})`);

        if (!gradioApp().getElementById("lbw_ratiospreset")) {
            return;
        }

        const genButtons = gradioApp().querySelectorAll("button:is([id*='_generate'])");
        genButtons.forEach((genBtn) => {
            genBtn.addEventListener('click', () => {
                if (WeightHelper.last_instance) {
                    WeightHelper.last_instance.close();
                }
            }, true);
        });
        const textareas = gradioApp().querySelectorAll("*:is([id*='_toprow'] [id*='_prompt'], .prompt) textarea");
        textareas.forEach((textarea) => {
            WeightHelper.attach(textarea);
        });
    });

    fetch(`/file=extensions/${WeightHelper.PLUGIN_DIRNAME}/icon/reload.svg`)
        .then(response => response.text())
        .then(svg => {
            WeightHelper.SVG_RELOAD = svg;
        }
    );
    fetch(`/file=extensions/${WeightHelper.PLUGIN_DIRNAME}/icon/lock.svg`)
        .then(response => response.text())
        .then(svg => {
            WeightHelper.SVG_LOCK = svg;
        }
    );
});
