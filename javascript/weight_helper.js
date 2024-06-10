'use strict';

(function() {
    const VERSION = "1.2.0"

    var jq;

    var weight_helper_data = {};
    var weight_helper_preview_info = {};

    var sampling_steps;

    const REGEX = /<([^:]+):([^:]+):([^>]+)>/;
    const TAG_TYPES = ["lora", "lyco"];

    const SPECIAL_KEYWORDS = ["XYZ"];

    const SPECIAL_PRESETS = {
        lora: {
            SD: { XYZ: "XYZ(17)" },
            SDXL: { XYZ: "XYZ(12)" }
        },
        lycoris: {
            SD: { XYZ: "XYZ(26)" },
            SDXL: { XYZ: "XYZ(20)" }
        },
        unknown: { XYZ: "XYZ(26)" }
    };

    const LORA_TYPE_PULLDOWN = {
        "LoRA(LierLa)": "lora",
        "LyCORIS,etc": "lycoris"
    };

    const LBW_WEIGHT_SD_VERSIONS = ["SD", "SDXL"];

    const LBW_WEIGHT_SETTINGS = {
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

    const WEIGHT_SETTINGS = {
        te: {
            label: "TEnc",
            min: undefined, max: undefined, default: 100, step: undefined
        },
        unet: {
            label: "UNet",
            min: undefined, max: undefined, default: undefined, step: undefined
        },
        dyn: {
            label: "Dyn",
            min: undefined, max: undefined, default: undefined, step: undefined
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
            min: undefined, max: undefined, default: 100, step: undefined
        }
    };

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

    var last_instance = undefined;

    class WeightData {
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
                let masks = null;
                if (this.lbw_lora_type && this.lbw_sd_version) {
                    masks = LBW_WEIGHT_SETTINGS[this.lbw_lora_type][this.lbw_sd_version].masks;
                }
                for (let i = 0; i < this.lbw.length; i++) {
                    if ((!masks || masks[i] === 1) && this.lbw[i] !== other.lbw[i]) {
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
                let masks = null;
                if (this.lbw_lora_type && this.lbw_sd_version) {
                    masks = LBW_WEIGHT_SETTINGS[this.lbw_lora_type][this.lbw_sd_version].masks;
                }
                for (let i = 0; i < this.lbw.length; i++) {
                    const val = !masks || masks[i] === 1 ? this.lbw[i] : 0;
                    hash = calcHash(val);
                }
            }
            return hash & 0xffffffff;
        }
    }

    class WeightHelper {

        static MAIN_TEMPLATE;
        static PREVIEW_TEMPLATE;
        static PRESETS_TEMPLATE;
        static LBWBLOCKS_TEMPLATE;
        static LBWS_TEMPLATE;

        mainBody;
        previewBody;
        lbwDOMs = [];

        weightData = {};
        bindData = {
            mainBindData: {},
            lbwPresetBindDatas: [],
            lbwBlockBindDatas: [],
            lbwBindDatas: [],
            previewBindData: null
        }
        weightElements = {};

        usingExecCommand = false;

        tabId = null;
        offsetX = 0;
        offsetY = 0;
        isDragging = false;

        lbwPresetsMap = {};
        lbwPresetsValueKeyMap = {};

        metadata = {};
        previewInfo = {};

        tagName = null;
        name = null;
        nameHash = null;
        multiplier = null;
        currentHistory = null;
        currentLockSet = new WeightSet();
        weightData = new WeightData();

        lastSelectionStart = null;
        lastSelectionEnd = null;
        lastText = null;

        historyIndex = 0;

        openedExtraOption = false;

        releaseFunctions = [];

        static attach(textarea) {
            textarea.addEventListener('contextmenu', (e) => {
                if (!opts.weight_helper_enabled) {
                    return;
                }
                if (last_instance) {
                    e.preventDefault();
                    last_instance.close();
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
                const match = REGEX.exec(selectedText);
                if (match) {
                    const loraType = match[1].toLowerCase();
                    const name = match[2];
                    const multiplier = match[3];

                    if (TAG_TYPES.includes(loraType)) {
                        e.preventDefault();
                        const tabId = e.target.closest("[id^='tab_'][class*='tabitem']").id.split("_")[1];
                        const selectionStart = tmpSelectionStart + match.index;
                        const selectionEnd = selectionStart + match.input.trim().length;
                        const weightHelper = new WeightHelper(tabId, e.target, selectionStart, selectionEnd, loraType, name, multiplier);
                        weightHelper.setup();
                        weightHelper.show(e.pageY + 15, e.pageX);
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
            sampling_steps = Math.round(samplingSteps.value * 100);

            if (opts.weight_helper_using_execCommand) {
                if (typeof document.execCommand === 'function') {
                    this.usingExecCommand = true;
                } else {
                    console.warn("execCommand is not supported.");
                }
            }
        }

        setup() {
            this.initSettings();
            this.initWeightData();
            this.initHistory();

            this.setupMainBindData();
            this.setupLbwBindData();

            this.buildDOM();
            if (this.weightData.lbw_sd_version) {
                this.redrawLbw();
            }
        }

        initSettings() {
            const optBlockPattern = /((BASE|MID|M00|(IN|OUT)[0-9]{1,2}(-(IN|OUT)[0-9]{1,2})?) *(, *|$))+/;
            for (let loraType of Object.values(LORA_TYPE_PULLDOWN)) {
                for (let sdVersion of LBW_WEIGHT_SD_VERSIONS) {
                    try {
                        let optBlockPoints = opts[`weight_helper_lbw_${loraType}_${sdVersion.toLowerCase()}_block_points`]
                        optBlockPoints = optBlockPoints.replace("MID", "M00");
                        if (optBlockPattern.exec(optBlockPoints)) {
                            const blockPoints = optBlockPoints.split(',').map(v => {
                                return v.trim().replace(/\d+/g, match => match.length === 1 ? `0${match}` : match);
                            });
                            this.getLbwWeightSetting(loraType, sdVersion).block_points = blockPoints;
                        }
                    } catch (e) {
                        console.warn(`${loraType}_${sdVersion} block definition format is invalid.`, e);
                    }
                }
            }

            for (const k of ["te", "unet", "dyn", "lbw"]) {
                WEIGHT_SETTINGS[k].min  = Math.round(opts[`weight_helper_${k}_min`] * 100);
                WEIGHT_SETTINGS[k].max  = Math.round(opts[`weight_helper_${k}_max`] * 100);
                WEIGHT_SETTINGS[k].step = Math.round(opts[`weight_helper_${k}_step`] * 100);
            }
            WEIGHT_SETTINGS.start.max = sampling_steps;
            WEIGHT_SETTINGS.stop.max = sampling_steps;
            WEIGHT_SETTINGS.stop.default = sampling_steps;

            const lbwPreset = gradioApp().getElementById("lbw_ratiospreset").querySelector("textarea");
            let lbwPresetValue = lbwPreset.value ?? "";
            const lbwPresets = lbwPresetValue.split("\n").filter(e => e.trim() !== '');
            for (const loraType of Object.values(LORA_TYPE_PULLDOWN)) {
                this.lbwPresetsMap[loraType] = {};
                this.lbwPresetsValueKeyMap[loraType] = {};
                for (const sdVersion of LBW_WEIGHT_SD_VERSIONS) {
                    let lbwPreset = {};
                    let lbwPresetValueKey = {};

                    this.lbwPresetsMap[loraType][sdVersion] = lbwPreset;
                    this.lbwPresetsValueKeyMap[loraType][sdVersion] = lbwPresetValueKey;

                    const blockLength = this.getLbwWeightSetting(loraType, sdVersion).masks.filter((b) => b == 1).length;
                    for (const line of lbwPresets) {
                        const kv = line.split(":");
                        if (kv.length == 2 && kv[1].split(",").length == blockLength) {
                            lbwPreset[kv[0]] = kv[1];
                            lbwPresetValueKey[kv[1]] = kv[0];
                        }
                    }
                }
            }
        }

        initWeightData() {
            if (!(this.nameHash in weight_helper_data)) {
                weight_helper_data[this.nameHash] = { "lock": [], "history": [], "lora_info": {} }
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

            for (const weightType of Object.keys(WEIGHT_SETTINGS)) {
                this.weightData[weightType] = []
                this.weightData[weightType].push(WEIGHT_SETTINGS[weightType].default);
            }

            this.weightData.lbw = [];
            this.weightData.lbwe = [];
            this.weightData.special = "";

            const multipliers = this.multiplier.split(":");

            const multiplierMap = {}
            for (let i = 0; i < multipliers.length; i++) {
                let key;
                let value;
                if (multipliers[i].indexOf("=") >= 0) {
                    const keyValue = multipliers[i].split("=");
                    key = keyValue[0].toLowerCase();
                    value = keyValue[1];
                } else {
                    key = ["te", "unet", "dyn"][i];
                    value = multipliers[i];
                }
                multiplierMap[key] = value;
            }

            let assumedSdVersion = null;
            let assumedLoraType = null;
            Object.entries(multiplierMap).forEach(kv => {
                const group = kv[0];
                const value = kv[1];
                if (group === "lbw") {
                    let blocks = value.split(',');
                    if (blocks.length === 1 && SPECIAL_KEYWORDS.includes(value)) {
                        this.weightData.special = value;
                    } else {
                        const loraSdCombination = [];
                        for (const loraType of Object.values(LORA_TYPE_PULLDOWN)) {
                            for (const sdVersion of LBW_WEIGHT_SD_VERSIONS) {
                                loraSdCombination.push({
                                    loraType: loraType,
                                    sdVersion: sdVersion
                                });
                            }
                        }
                        for (const loraSd of loraSdCombination) {
                            const loraType = loraSd.loraType;
                            const sdVersion = loraSd.sdVersion;
                            if (blocks.length === 1) {
                                const lbwPresets = this.getLbwPresets(loraType, sdVersion);
                                if (value in lbwPresets) {
                                    blocks = lbwPresets[value].split(',');
                                } else {
                                    continue;
                                }
                            }
                            const masks = this.getLbwWeightSetting(loraType, sdVersion).masks;
                            if (blocks.length === masks.filter((b) => b == 1).length) {
                                assumedSdVersion = sdVersion;
                                assumedLoraType = loraType;
                                let refIdx = 0;
                                for (let enable of masks) {
                                    if (enable) {
                                        this.weightData.lbw.push(Math.round(blocks[refIdx] * 100));
                                        refIdx++;
                                    } else {
                                        this.weightData.lbw.push(0);
                                    }
                                }
                                break;
                            }
                        }
                    }
                } else if (group === "step") {
                    const startStop = value.split('-');
                    this.weightData.start[0] = Math.round(startStop[0] * 100);
                    this.weightData.stop[0] = Math.round(startStop[1] * 100);
                } else if (group === "lbwe") {
                    this.weightData[group][0] = value;
                } else {
                    this.weightData[group][0] = Math.round(value * 100);
                }
            });
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

            const masks = this.getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
            this.weightData.masks = masks;
            if (this.weightData.lbw.length === 0) {
                this.weightData.lbw = new Array(masks.length).fill(100);
            }
        }

        initHistory() {
            if (!("lock" in weight_helper_data[this.nameHash])) {
                weight_helper_data[this.nameHash].lock = [];
            }
            weight_helper_data[this.nameHash].lock.forEach(lock => {
                this.currentLockSet.add(lock.hashCode(), lock);
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
                if (this.weightData.isSpecial()) {
                    this.weightData.lbw = structuredClone(latestHistory.lbw);
                }
                if (!this.weightData.equals(latestHistory)) {
                    this.currentHistory.push(this.weightData.clone());
                }
            }
            this.historyIndex = this.currentHistory.length - 1;
        }

        initWeightForm(weight, weightSetting, weightData, idx = 0) {
            const fVal = weightData[idx];
            weight.sliderMin = fVal < weightSetting.min ? fVal : weightSetting.min;
            weight.sliderMax = fVal > weightSetting.max ? fVal : weightSetting.max;
            weight.sliderStep = weightSetting.step;
            weight.sliderValue = fVal;
            weight.updownStep = weightSetting.step / 100;
            weight.updownValue = weightData[idx] / 100;
        }

        setupMainBindData() {
            const mainBindData = [];
            this.bindData.mainBindData = mainBindData;

            mainBindData.title = this.name;
            mainBindData.page = `${this.historyIndex + 1}/${this.currentHistory.length}`;
            let scale = opts.weight_helper_context_menu_scale;
            if (scale <= 0) {
                scale = 1;
            }
            mainBindData.scale = scale;

            const lock = {}
            mainBindData.lock = lock;
            const weightDataHash = this.weightData.hashCode();
            const isLocked = this.currentLockSet.has(weightDataHash);
            lock.flag = isLocked ? "like" : "unlike";
            lock.visible = !this.weightData.isSpecial() && this.weightData.lbw_sd_version;

            const weights = []
            mainBindData.weights = weights;
            for (const group of Object.keys(WEIGHT_SETTINGS)) {
                if (group === "lbw") continue;

                const weightSetting = WEIGHT_SETTINGS[group];
                const weightData = this.weightData[group];

                const weight = {}
                const useCheck = weightSetting.default === undefined;
                if (useCheck) {
                    if (weightData[0] != null) {
                        weight.checked = true;
                    } else {
                        weightData[0] = 0;
                    }
                }

                this.initWeightForm(weight, weightSetting, weightData);
                weight.group = group;
                weight.label = weightSetting.label;
                weight.useCheck = useCheck;
                weight.visible = true;
                if (group !== "te") {
                    if (useCheck) {
                        if (!weight.checked) {
                            weight.visible = false;
                        }
                    } else if (weightData[0] == weightSetting.default) {
                        weight.visible = false;
                    }
                }
                weights.push(weight);
            }

            const extraButton = {}
            mainBindData.extraButton = extraButton;
            if (weights.some(v => !v.visible)) {
                extraButton.visible = true;
            } else {
                this.openedExtraOption = true;
            }

            const loraTypes = [];
            mainBindData.loraTypes = loraTypes;
            for (const entry of Object.entries(LORA_TYPE_PULLDOWN)) {
                const loraType = {}
                loraType.name = entry[0];
                loraType.value = entry[1];
                if (loraType.value === this.weightData.lbw_lora_type) {
                    loraType.selected = true;
                }
                loraTypes.push(loraType);
            }

            const sdvers = [];
            mainBindData.sdvers = sdvers;
            for (const sdVersion of LBW_WEIGHT_SD_VERSIONS) {
                const sdver = {}
                sdver.name = sdVersion;
                sdver.value = sdVersion;
                sdver.checked = sdVersion == this.weightData.lbw_sd_version;
                sdvers.push(sdver);
            }

            const xyz = {};
            mainBindData.xyz = xyz;

            const specialPresets = this.getLbwSpecialPreset(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version);
            xyz.checked = this.weightData.special === "XYZ";
            xyz.label = specialPresets.XYZ;
        }

        setupLbwBindData() {
            const lbwBindDatas = [];
            this.bindData.lbwBindDatas = lbwBindDatas;

            const group = "lbw"
            const lbwSetting = WEIGHT_SETTINGS[group];
            const lbwData = this.weightData[group];
            for (let idx = 0; idx < lbwData.length; idx++) {
                const lbwWeight = {}
                this.initWeightForm(lbwWeight, lbwSetting, lbwData, idx);
                lbwWeight.group = group;
                lbwWeight.label = lbwSetting.labels[idx];
                lbwBindDatas.push(lbwWeight);
            }
        }

        buildDOM() {
            const parser = new DOMParser();
            const mainHtml = WeightHelper.MAIN_TEMPLATE(this.bindData.mainBindData);
            const mainDoc = parser.parseFromString(mainHtml, 'text/html');
            this.mainBody = mainDoc.body.firstChild;

            const lbwsHtml = WeightHelper.LBWS_TEMPLATE({ lbws: this.bindData.lbwBindDatas });
            const lbwsDoc = parser.parseFromString(lbwsHtml, 'text/html');
            this.lbwDOMs = [...lbwsDoc.body.children];

            [...mainDoc.getElementsByClassName("wh:weight")].forEach(elem => {
                const data = {}
                const group = elem.dataset.group;
                const check = elem.getElementsByClassName("wh:check");
                data.check = check.length > 0 ? check[0] : undefined;
                data.slider = elem.getElementsByClassName("wh:slider")[0];
                data.updown = elem.getElementsByClassName("wh:updown")[0];
                this.weightElements[group] = [data];
            });

            this.weightElements["lbw"] = [];
            [...lbwsDoc.getElementsByClassName("wh:lbw")].forEach(elem => {
                const data = {}
                data.check = undefined;
                data.slider = elem.getElementsByClassName("wh:slider")[0];
                data.updown = elem.getElementsByClassName("wh:updown")[0];
                this.weightElements["lbw"].push(data);
            });

            this.attachEvent(this.mainBody, "click", (e) => e.stopPropagation());

            this.attachEvent(mainDoc.getElementById("wh:header"), "mousedown", (e) => {
                this.isDragging = true;
                this.offsetX = e.clientX - this.mainBody.getBoundingClientRect().left;
                this.offsetY = e.clientY - this.mainBody.getBoundingClientRect().top;
            });
            this.attachEvent(this.mainBody, "mousemove", (e) => {
                if (!this.isDragging) return;

                const x = e.clientX - this.offsetX + window.scrollX;
                const y = e.clientY - this.offsetY + window.scrollY;

                this.mainBody.style.left = x + 'px';
                this.mainBody.style.top = y + 'px';
            });
            this.attachEvent(document.body, "mouseup", () => {
                this.isDragging = false;
            });

            this.attachEvent(mainDoc.getElementById("wh:lock"), "click", () => {
                const weightDataHash = this.weightData.hashCode();
                const isLocked = this.currentLockSet.has(weightDataHash);

                this.updateLockedIcon(!isLocked);
                if (isLocked) {
                    this.currentLockSet.delete(weightDataHash);
                } else {
                    const weightDataClone = this.weightData.clone();
                    if (weightDataClone.stop[0] == WEIGHT_SETTINGS.stop.default) {
                        weightDataClone.stop[0] = null;
                    }
                    this.currentLockSet.add(weightDataHash, weightDataClone);
                }
            });

            this.attachEvent(mainDoc.getElementById("wh:clear"), "click", () => {
                const newHistory = this.currentLockSet.getAll();
                if (newHistory.length == 0 || !newHistory[newHistory.length - 1].equals(this.weightData)) {
                    newHistory.push(this.weightData);
                }

                weight_helper_data[this.nameHash].history = newHistory;
                this.currentHistory = newHistory;

                document.getElementById("wh:page__label").textContent = `${newHistory.length}/${newHistory.length}`;
                this.historyIndex = newHistory.length - 1;
            });

            this.attachEvent(mainDoc.getElementById("wh:page__prev"), "click", () => {
                if (this.historyIndex <= 0) {
                    return;
                }
                this.historyIndex--;
                this.applyFromHistory();
            });
            this.attachEvent(mainDoc.getElementById("wh:page__next"), "click", () => {
                if (this.historyIndex >= this.currentHistory.length - 1) {
                    return;
                }
                this.historyIndex++;
                this.applyFromHistory();
            });

            this.attachEvent(mainDoc.getElementById("wh:reload"), "click", () => {
                this.loadMetadata(true);
            });

            const changedEvent = (group, useCheck) => {
                if (useCheck && !useCheck.checked) {
                    useCheck.checked = true;
                    this.weightData[`use_${group}`] = true;
                }

                const weightDataHash = this.weightData.hashCode();
                const isLocked = this.currentLockSet.has(weightDataHash);
                this.updateLockedIcon(isLocked);

                if (!this.usingExecCommand) {
                    const updatedText = this.makeUpdatedText();
                    this.update(updatedText);
                }
            }
            Object.entries(this.weightElements).forEach(entry => {
                const group = entry[0];
                if (group === "lbw") {
                    return;
                }
                const weights = entry[1];
                weights.forEach((weight, i) => {
                    if (weight.check) {
                        this.attachEvent(weight.check, "change", (e) => {
                            this.weightData[`use_${group}`] = e.target.checked;

                            const weightDataHash = this.weightData.hashCode();
                            const isLocked = this.currentLockSet.has(weightDataHash);
                            this.updateLockedIcon(isLocked);

                            if (!this.usingExecCommand) {
                                const updatedText = this.makeUpdatedText();
                                this.update(updatedText);
                            }
                        });
                    }
                    this.attachEvent(weight.slider, "input", (e) => {
                        const fVal = parseFloat(e.target.value);
                        this.weightData[group][i] = fVal;
                        weight.updown.value = Math.round(fVal) / 100;
                        changedEvent(group, weight.check);
                    });
                    this.attachEvent(weight.updown, "input", (e) => {
                        const fVal = Math.round(e.target.value * 100);
                        this.weightData[group][i] = fVal;
                        if (fVal < weight.slider.min) {
                            weight.slider.min = fVal;
                        }
                        if (fVal > weight.slider.max) {
                            weight.slider.max = fVal;
                        }
                        weight.slider.value = Math.round(fVal);
                        changedEvent(group, weight.check);
                    });
                })
            });

            this.attachEvent(mainDoc.getElementById("wh:extra_button"), "click", (e) => {
                e.target.remove();
                [...this.mainBody.getElementsByClassName("wh:weight")].forEach(f => {
                    f.style.display = '';
                })
                this.openedExtraOption = true;
            });

            this.attachEvent(mainDoc.getElementById("wh:lora_type"), "change", (e) => {
                this.weightData.lbw_lora_type = e.target.value;

                const xyzLabel = document.getElementById("wh:xyz_label");
                const specialPreset = this.getLbwSpecialPreset(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version);
                xyzLabel.textContent = specialPreset.XYZ;

                this.redrawLbw();
                if (!this.usingExecCommand) {
                    const updatedText = this.makeUpdatedText();
                    this.update(updatedText);
                }
                const masks = this.getLbwWeightSetting(e.target.value, this.weightData.lbw_sd_version).masks;
                this.weightData.masks = masks;
            });

            this.attachEvent(mainDoc.getElementsByClassName("wh:sdver"), "change", (e) => {
                this.weightData.lbw_sd_version = e.target.value;

                const xyzLabel = document.getElementById("wh:xyz_label");
                const specialPreset = this.getLbwSpecialPreset(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version);
                xyzLabel.textContent = specialPreset.XYZ;

                this.redrawLbw();
                if (!this.usingExecCommand) {
                    const updatedText = this.makeUpdatedText();
                    this.update(updatedText);
                }
                const masks = this.getLbwWeightSetting(this.weightData.lbw_lora_type, e.target.value).masks;
                this.weightData.masks = masks;
                if (!this.weightData.special) {
                    const lockIcon = document.getElementById("wh:lock");
                    lockIcon.style.visibility = "";
                    const isLocked = this.currentLockSet.has(this.weightData.hashCode());
                    this.updateLockedIcon(isLocked);
                }
            });

            this.attachEvent(mainDoc.getElementsByClassName("wh:preset_select"), "change", (e) => {
                const selectVal = e.target.value;
                if (!this.weightData.lbw_sd_version) {
                    return;
                }

                if (selectVal !== "") {
                    this.weightData.special = "";
                    const xyz = document.getElementById("wh:xyz");
                    xyz.checked = false;

                    const values = selectVal.split(",").map(v => Math.round(v * 100));
                    const masks = this.getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
                    let refIdx = 0;
                    for (let idx = 0; idx < masks.length; idx++) {
                        let val = 0;
                        if (masks[idx] === 1) {
                            val = values[refIdx];
                            refIdx++;
                        }
                        this.weightData.lbw[idx] = val;
                        this.weightElements.lbw[idx].slider.value = val;
                        this.weightElements.lbw[idx].updown.value = val / 100;
                    }

                    const lockIcon = document.getElementById("wh:lock");
                    lockIcon.style.visibility = "";

                    const weightDataHash = this.weightData.hashCode();
                    const isLocked = this.currentLockSet.has(weightDataHash);
                    this.updateLockedIcon(isLocked);

                    if (!this.usingExecCommand) {
                        const updatedText = this.makeUpdatedText();
                        this.update(updatedText);
                    }
                }
            });

            this.attachEvent(mainDoc.getElementById("wh:xyz"), "change", (e) => {
                const lockIcon = document.getElementById("wh:lock");
                if (e.target.checked) {
                    this.weightData.special = e.target.value;
                    lockIcon.style.visibility = "hidden";
                } else {
                    this.weightData.special = "";
                    lockIcon.style.visibility = this.weightData.lbw_sd_version ? "" : "hidden";

                    const weightDataHash = this.weightData.hashCode();
                    const isLocked = this.currentLockSet.has(weightDataHash);
                    this.updateLockedIcon(isLocked);
                }

                if (!this.usingExecCommand) {
                    const updatedText = this.makeUpdatedText();
                    this.update(updatedText);
                }
            });

            const lbwChangedEvent = () => {
                this.weightData.special = "";
                const xyz = document.getElementById("wh:xyz");
                xyz.checked = false;

                const lbwValues = this.getLbwWeightData().join(",");
                const select = this.mainBody.getElementsByClassName("wh:preset_select")[0];
                if (lbwValues in this.lbwPresetsValueKeyMap[this.weightData.lbw_lora_type][this.weightData.lbw_sd_version]) {
                    select.value = lbwValues;
                } else {
                    select.selectedIndex = 0;
                }

                const lockIcon = document.getElementById("wh:lock");
                lockIcon.style.visibility = "";

                const weightDataHash = this.weightData.hashCode();
                const isLocked = this.currentLockSet.has(weightDataHash);
                this.updateLockedIcon(isLocked);

                if (!this.usingExecCommand) {
                    const updatedText = this.makeUpdatedText();
                    this.update(updatedText);
                }
            }
            this.weightElements.lbw.forEach(lbw => {
                this.attachEvent(lbw.slider, "input", (e) => {
                    const fVal = parseFloat(e.target.value);
                    const idx = e.target.dataset.index;
                    this.weightData["lbw"][idx] = fVal;
                    lbw.updown.value = Math.round(fVal) / 100;
                    lbwChangedEvent();
                });
                this.attachEvent(lbw.updown, "input", (e) => {
                    const fVal = Math.round(e.target.value * 100);
                    const idx = e.target.dataset.index;
                    this.weightData["lbw"][idx] = fVal;
                    if (fVal < lbw.slider.min) {
                        lbw.slider.min = fVal;
                    }
                    if (fVal > lbw.slider.max) {
                        lbw.slider.max = fVal;
                    }
                    lbw.slider.value = fVal;
                    lbwChangedEvent();
                });
            });
        }

        async loadMetadata(force = false) {
            const domMetadata = document.getElementById("wh:metadata");
            const typeVal = document.getElementById("wh:metadata__alg");
            const sdVerVal = document.getElementById("wh:metadata__sdver");
            if (force) {
                domMetadata.classList.remove("error");
            }
            if (force || Object.keys(this.metadata).length == 0) {
                const startLoading = (elem) => {
                    if (elem.dataset.interval_id == null) {
                        elem.classList.add("loading");
                        const frames = ["-", "--", "---", "----", "-----", "------", "-------"];
                        let currentFrame = 0;
                        elem.dataset.interval_id = setInterval(() => {
                            elem.textContent = frames[currentFrame];
                            currentFrame = (currentFrame + 1) % frames.length;
                        }, 100);
                    }
                }
                const stopLoading = (elem) => {
                    if (elem.dataset.interval_id != null) {
                        elem.classList.remove("loading");
                        clearInterval(elem.dataset.interval_id);
                    }
                }
                startLoading(typeVal);
                startLoading(sdVerVal);
                const key = encodeURIComponent(this.name);
                this.metadata = await postAPI(`/whapi/v1/get_metadata?key=${key}`, null) ?? {};
                stopLoading(typeVal);
                stopLoading(sdVerVal);
            }
            if (Object.keys(this.metadata).length > 0) {
                if (this.metadata.sd_version && !this.weightData.lbw_sd_version) {
                    this.weightData.lbw_sd_version = this.metadata.sd_version === "SDXL" ? "SDXL" : "SD";
                    if (this.currentHistory.length == 1) {
                        this.currentHistory[0].lbw_sd_version = this.weightData.lbw_sd_version;
                    }
                    let selectedRadio = undefined;
                    [...this.mainBody.getElementsByClassName("wh:sdver")].forEach((radio) => {
                        if (radio.value === this.weightData.lbw_sd_version) {
                            radio.checked = true;
                            selectedRadio = radio;
                        }
                    });
                    if (selectedRadio) {
                        selectedRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                typeVal.textContent = this.metadata.algorithm ?? "Unknown";
                let sdVersion = this.metadata.sd_version ?? "Unknown";
                if (this.metadata.base_model) {
                    sdVersion += `(${this.metadata.base_model})`;
                }
                sdVerVal.textContent = sdVersion;
            } else {
                metadata.classList.add("error");
                typeVal.textContent = "TIMEOUT";
                sdVerVal.textContent = "TIMEOUT";
            }
        }

        async loadPreviewBindData() {
            if (Object.keys(this.previewInfo).length == 0) {
                const key = encodeURIComponent(this.name);
                this.previewInfo = await postAPI(`/whapi/v1/get_preview_info?key=${key}`, null);
            }

            const preview = {}
            this.bindData.previewBindData = preview;
            if (Object.keys(this.previewInfo).length > 0) {
                preview.hasResponse = true;
                preview.previewUrl = this.previewInfo.preview_url;
                preview.hasMetadata = this.previewInfo.has_metadata;
                preview.modelName = this.previewInfo.model_name;
                if (typeof extraNetworksRequestMetadata === "function") {
                    preview.definedExtraNetworksRequestMetadata = true;
                }
                if (typeof extraNetworksEditUserMetadata === "function") {
                    preview.definedExtraNetworksEditUserMetadata = true;
                }
                preview.modelId = this.previewInfo.model_id;
                preview.description = this.previewInfo.description;

                preview.trgWords = this.previewInfo.trigger_words ?? [];
                preview.negTrgWords = this.previewInfo.negative_trigger_words ?? [];
                if (preview.trgWords.length > 0 || preview.negTrgWords.length > 0) {
                    preview.hasTriggerWords = true;
                }
                preview.height = opts.weight_helper_preview_height;
                switch (opts.weight_helper_preview_position) {
                    case "Bottom Right":
                        preview.pos = [null, null, 0, this.mainBody.clientWidth + 6];
                        break;
                    case "Top Left":
                        preview.pos = [0, this.mainBody.clientWidth + 6, null, null];
                        break;
                    case "Bottom Left":
                        preview.pos = [null, this.mainBody.clientWidth + 6, 0, null];
                        break;
                    default:
                        preview.pos = [0, null, null, this.mainBody.clientWidth + 6];
                        break;
                }
            }
        }

        buildPreviewDOM() {
            const parser = new DOMParser();
            const previewHtml = WeightHelper.PREVIEW_TEMPLATE({ preview: this.bindData.previewBindData });
            const previewDoc = parser.parseFromString(previewHtml, 'text/html');
            this.previewBody = previewDoc.body.firstChild;

            const preview = this.bindData.previewBindData;
            this.attachEvent(previewDoc.getElementById("wh:preview__metadata"), "click", (e) => {
                extraNetworksRequestMetadata(e, 'lora', preview.modelName);
            });
            this.attachEvent(previewDoc.getElementById("wh:preview__edit"), "click", (e) => {
                extraNetworksEditUserMetadata(e, this.tabId, 'lora', preview.modelName);
            });
            this.attachEvent(previewDoc.getElementById("wh:preview__civitai"), "click", () => {
                window.open(`https://civitai.com/models/${preview.modelId}`, '_blank');
            });
            this.attachEvent(previewDoc.getElementById("wh:preview__add-trigger"), "click", (e) => {
                let promptTextarea = document.querySelector(`#${this.tabId}_prompt textarea`);
                let negativeTextarea = document.querySelector(`#${this.tabId}_neg_prompt textarea`);
                if (this.textarea === negativeTextarea) {
                } else if (this.textarea !== promptTextarea) {
                    promptTextarea = this.textarea;
                    negativeTextarea = null;
                }
                const negTrgWords = preview.negTrgWords;
                const trgWords = preview.trgWords;
                if (!this.usingExecCommand) {
                    const insert = (wordArray, textarea) => {
                        if (wordArray.length > 0 && textarea) {
                            let words = wordArray.join(", ");
                            if (textarea.value) words = ", " + words;
                            textarea.value += words;
                        }
                    }
                    insert(negTrgWords, negativeTextarea);
                    insert(trgWords, promptTextarea);
                } else {
                    const insert = (wordArray, textarea) => {
                        if (wordArray.length > 0 && textarea) {
                            let words = wordArray.join(", ");
                            if (textarea.value) words = ", " + words;
                            textarea.focus();
                            const eolIndex = textarea.value.length;
                            textarea.setSelectionRange(eolIndex, eolIndex);
                            document.execCommand("insertText", false, words);
                        }
                    }
                    withoutTAC(() => {
                        insert(negTrgWords, negativeTextarea);
                        insert(trgWords, promptTextarea);
                    });
                }
                e.target.remove();
            });

            const topRow = previewDoc.getElementById("wh:preview__top-row");
            const bottomRow = previewDoc.getElementById("wh:preview__bottom-row");
            const desc = previewDoc.getElementById("wh:preview__desc");
            const open = previewDoc.getElementById("wh:preview__note-open");
            const close = previewDoc.getElementById("wh:preview__note-close");
            this.attachEvent(open, "click", () => {
                topRow.style.visibility = "hidden";
                bottomRow.style.visibility = "hidden";
                desc.style.visibility = "visible";
                close.style.visibility = "visible";
            });
            this.attachEvent(close, "click", () => {
                topRow.style.visibility = "";
                bottomRow.style.visibility = "";
                desc.style.visibility = "";
                close.style.visibility = "";
            });
        }

        redrawLbw() {
            const parser = new DOMParser();

            const presetBindDatas = [];
            this.bindData.lbwPresetBindDatas = presetBindDatas;

            const lbwSdVersion = this.weightData.lbw_sd_version;
            if (lbwSdVersion) {
                const lbwLoraType = this.weightData.lbw_lora_type;
                if (Object.keys(this.getLbwPresets(lbwLoraType, lbwSdVersion)).length) {
                    const lbwWeightData = this.getLbwWeightData();
                    const strLbwWeightData = Array.isArray(lbwWeightData) ? lbwWeightData.join(",") : lbwWeightData;
                    const lbwPresets = this.getLbwPresets(lbwLoraType, lbwSdVersion);
                    for (const key of Object.keys(lbwPresets)) {
                        const preset = {}
                        preset.name = key;
                        preset.value = lbwPresets[key];
                        if (preset.value === strLbwWeightData) {
                            preset.selected = true;
                        }
                        presetBindDatas.push(preset);
                    }
                }
            }

            const presetSelect = this.mainBody.getElementsByClassName("wh:preset_select")[0];
            const presetHtml = WeightHelper.PRESETS_TEMPLATE({ presets: this.bindData.lbwPresetBindDatas });
            const previewDoc = parser.parseFromString(presetHtml, 'text/html');
            while (presetSelect.firstChild) {
                presetSelect.firstChild.remove();
            }
            const presetFragment = document.createDocumentFragment();
            [...previewDoc.body.children].forEach(element => {
                presetFragment.appendChild(element);
            });
            presetSelect.appendChild(presetFragment);

            const lbwBlockBindDatas = [];
            this.bindData.lbwBlockBindDatas = lbwBlockBindDatas;

            const lbwWeightSetting = this.getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version);
            for (const blockPoint of lbwWeightSetting.block_points) {
                lbwBlockBindDatas.push({label: blockPoint});
            }

            const lbwblocks = this.mainBody.getElementsByClassName("wh:lbwblocks")[0];
            const lbwblocksHtml = WeightHelper.LBWBLOCKS_TEMPLATE({ lbwBlocks: this.bindData.lbwBlockBindDatas });
            const lbwblocksDoc = parser.parseFromString(lbwblocksHtml, 'text/html');
            while (lbwblocks.firstChild) {
                lbwblocks.firstChild.remove();
            }
            const lbwblockFragment = document.createDocumentFragment();
            [...lbwblocksDoc.body.children].forEach(element => {
                lbwblockFragment.appendChild(element);
            });

            const labelMap = {};
            for (let idx = 0; idx < WEIGHT_SETTINGS.lbw.labels.length; idx++) {
                labelMap[WEIGHT_SETTINGS.lbw.labels[idx]] = idx;
            }
            for (const blockPoint of lbwWeightSetting.block_points) {
                const lbwblock = lbwblockFragment.getElementById(`wh:lbwblock_${blockPoint.toLowerCase()}`);
                const points = blockPoint.split("-");
                let pointStart = labelMap[points[0]];
                let pointEnd = pointStart;
                if (points.length > 1) {
                    pointEnd = labelMap[points[1]];
                }
                for (let idx = pointStart; idx <= pointEnd; idx++) {
                    if (lbwWeightSetting.masks[idx] == 1) {
                        lbwblock.appendChild(this.lbwDOMs[idx]);
                    }
                }
            }
            lbwblocks.appendChild(lbwblockFragment);
        }

        applyFromHistory() {
            document.getElementById("wh:page__label").textContent = `${this.historyIndex + 1}/${this.currentHistory.length}`;
            const oldSdVersion = this.weightData.lbw_sd_version;
            this.weightData = this.currentHistory[this.historyIndex].clone();

            const lockIcon = document.getElementById("wh:lock");
            if (this.weightData.isSpecial() || !this.weightData.lbw_sd_version) {
                lockIcon.style.visibility = "hidden";
            } else {
                lockIcon.style.visibility = "";
            }

            Object.entries(this.weightData).map(entry => {
                const group = entry[0];
                const vals = entry[1];
                if (group === "stop" && vals[0] == null) {
                    vals[0] = WEIGHT_SETTINGS[group].default;
                }
                if (Array.isArray(vals) && group in this.weightElements) {
                    for (const idx in vals) {
                        let fVal = vals[idx];
                        let isExtraType = false;
                        let show = false;
                        if (["unet", "dyn", "start", "stop"].includes(group)) {
                            isExtraType = true;
                            if (this.weightElements[group][0].check) {
                                const useCheck = this.weightData[`use_${group}`];
                                this.weightElements[group][0].check.checked = useCheck;
                                show = useCheck;
                            }
                            if (["start", "stop"].includes(group)) {
                                if (fVal != null && fVal != WEIGHT_SETTINGS[group].default) {
                                    show = true;
                                }
                            }
                        }
                        if (!this.openedExtraOption && isExtraType) {
                            const parent = document.getElementById(`wh:weight_${group}`);
                            parent.style.display = show ? "flex" : "none";
                        }
                        if (fVal == null) {
                            fVal = 0;
                        }
                        this.weightElements[group][idx].slider.value = fVal;
                        this.weightElements[group][idx].updown.value = fVal / 100;
                    }
                }
            });

            if (oldSdVersion !== this.weightData.lbw_sd_version) {
                const loraTypeSelect = document.getElementById("wh:lora_type");
                loraTypeSelect.value = this.weightData.lbw_lora_type;
                [...this.mainBody.getElementsByClassName("wh:sdver")].forEach((radio) => {
                    radio.checked = radio.value === this.weightData.lbw_sd_version;
                });
                this.redrawLbw();
            } else {
                const presetSelect = this.mainBody.getElementsByClassName("wh:preset_select")[0];
                if (this.weightData.special) {
                    presetSelect.value = this.weightData.special;
                } else {
                    const lbwValues = this.getLbwWeightData().join(",");
                    const presetValues = this.lbwPresetsValueKeyMap[this.weightData.lbw_lora_type][this.weightData.lbw_sd_version];
                    try {
                        if (lbwValues in presetValues) {
                            presetSelect.value = lbwValues;
                        } else {
                            presetSelect.selectedIndex = 0;
                        }
                    } catch (error) {
                        console.error(error, presetValues, lbwValues);
                    }
                }
            }
            const lbwBlocks = this.mainBody.getElementsByClassName("wh:lbwblocks")[0];
            lbwBlocks.style.display = this.weightData.lbw_sd_version ? "flex" : "none";

            if (!this.usingExecCommand) {
                const updatedText = this.makeUpdatedText();
                this.update(updatedText);
            }

            const weightDataHash = this.weightData.hashCode();
            const isLocked = this.currentLockSet.has(weightDataHash);
            this.updateLockedIcon(isLocked);
        }

        getLbwWeightData() {
            if (this.weightData.isSpecial()) {
                return this.weightData.special;
            }
            const masks = this.getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
            return this.weightData.lbw.filter((_, i) => masks[i] === 1).map(v => v / 100);
        }

        getLbwPresets(lbwLoraType, lbwSdVersion) {
            if (lbwSdVersion) {
                if (lbwLoraType in this.lbwPresetsMap && lbwSdVersion in this.lbwPresetsMap[lbwLoraType]) {
                    return this.lbwPresetsMap[lbwLoraType][lbwSdVersion];
                }
            }
            return {};
        }

        getLbwWeightSetting(lbwLoraType, lbwSdVersion) {
            if (lbwSdVersion) {
                if (lbwLoraType in LBW_WEIGHT_SETTINGS && lbwSdVersion in LBW_WEIGHT_SETTINGS[lbwLoraType]) {
                    return LBW_WEIGHT_SETTINGS[lbwLoraType][lbwSdVersion];
                }
            }
            return LBW_WEIGHT_SETTINGS.unknown;
        }

        getLbwSpecialPreset(loraType, sdVersion) {
            if (sdVersion) {
                if (loraType in SPECIAL_PRESETS && sdVersion in SPECIAL_PRESETS[loraType]) {
                    return SPECIAL_PRESETS[loraType][sdVersion];
                }
            }
            return SPECIAL_PRESETS.unknown;
        }

        updateLockedIcon(isLocked) {
            const flag = isLocked ? "like" : "unlike";
            const lockIcon = document.getElementById("wh:lock");
            lockIcon.className = `lock ${flag}`;
        }

        makeUpdatedText() {
            let updatedText = `<${this.tagName}:${this.name}`;
            const optionalTypes = ["te", "unet", "dyn"];
            let refIdx = 0;
            for (let idx = 0; idx < optionalTypes.length; idx++) {
                const keyType = optionalTypes[idx];
                if (keyType in this.weightData) {
                    const defVal = WEIGHT_SETTINGS[keyType].default;
                    const val = this.weightData[keyType];
                    let output = false;
                    if (keyType === "te") {
                        output = true;
                    } else if (this.weightElements[keyType][0].check) {
                        if (this.weightElements[keyType][0].check.checked) {
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
            const startDefVal = WEIGHT_SETTINGS.start.default;
            const startVal = this.weightData.start;
            const stopDefVal = WEIGHT_SETTINGS.stop.default;
            const stopVal = this.weightData.stop;
            if (startVal != startDefVal && stopVal != stopDefVal) {
                updatedText += `:step=${startVal / 100}-${stopVal / 100}`;
            } else if (startVal != startDefVal) {
                updatedText += `:start=${startVal / 100}`;
            } else if (stopVal != stopDefVal) {
                updatedText += `:stop=${stopVal / 100}`;
            }

            let lbwWeights = [];
            const masks = this.getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
            for (let idx = 0; idx < masks.length; idx++) {
                if (masks[idx]) {
                    lbwWeights.push(this.weightData.lbw[idx]);
                }
            }
            if (!this.weightData.special) {
                if (!lbwWeights.every(val => val === WEIGHT_SETTINGS.lbw.default)) {
                    let rateValues = lbwWeights.map(v => v / 100).join(",");
                    const lbwValues = this.getLbwWeightData().join(",");

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

        update(updatedText) {
            this.textarea.value = this.textarea.value.substring(0, this.lastSelectionStart) + updatedText + this.textarea.value.substring(this.lastSelectionEnd);
            this.lastSelectionEnd = this.lastSelectionStart + updatedText.length;
        }

        updateWithExecCommand(updatedText) {
            withoutTAC(() => {
                this.textarea.focus();
                this.textarea.setSelectionRange(this.lastSelectionStart, this.lastSelectionEnd);
                document.execCommand("insertText", false, updatedText);
            });
        }

        save() {
            const loraInfo = weight_helper_data[this.nameHash].lora_info;
            loraInfo.metadata = this.metadata;
            loraInfo.selected_lora_type.lbw_lora_type = this.weightData.lbw_lora_type;
            loraInfo.selected_lora_type.lbw_sd_version = this.weightData.lbw_sd_version;

            const lbwDefault = WEIGHT_SETTINGS.lbw.default;
            const masks = this.getLbwWeightSetting(this.weightData.lbw_lora_type, this.weightData.lbw_sd_version).masks;
            for (let idx = 0; idx < masks.length; idx++) {
                if (masks[idx] !== 1) {
                    this.weightData.lbw[idx] = lbwDefault;
                }
            }

            if (this.weightData.lbw_sd_version) {
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
                if (this.weightData.stop[0] == WEIGHT_SETTINGS.stop.default) {
                    this.weightData.stop[0] = null;
                }
                weight_helper_data[this.nameHash].lock = this.currentLockSet.getAll();
            }
            weight_helper_data.VERSION = VERSION;
            localStorage.setItem("weight_helper_data", JSON.stringify(weight_helper_data));
        }

        attachEvent(doms, eventName, func) {
            if (doms == null) return;
            if (doms instanceof HTMLCollection) {
                if (doms.length === 0) return;
            } else {
                doms = [doms];
            }
            for (const dom of doms) {
                dom.addEventListener(eventName, func);
                this.releaseFunctions.push(() => dom.removeEventListener(eventName, func));
            }
        }

        show(top, left) {
            this.mainBody.style.top = top + 'px';
            this.mainBody.style.left = left + 'px';
            document.body.appendChild(this.mainBody);

            const diffBottom = window.innerHeight - this.mainBody.getBoundingClientRect().bottom;
            if (diffBottom < 0) {
                this.mainBody.style.top = (top + diffBottom) + 'px';
                const diffTop = this.mainBody.getBoundingClientRect().top;
                if (diffTop < 0) {
                    this.mainBody.style.top = window.scrollY + 'px';
                }
            }
            this.attachEvent(document.body, "click", this.close);
            this.attachEvent(document.body, "keyup", this.cancel);
            last_instance = this;

            this.loadMetadata();

            if (opts.weight_helper_show_preview) {
                this.loadPreviewBindData().then(() => {
                    this.buildPreviewDOM();
                    this.mainBody.prepend(this.previewBody);
                });
            }
        }

        close = (e) => {
            if (!this.mainBody) return;
            if (e) {
                if (this.mainBody.contains(e.target)) return;
                if (e.target.id === `${this.tabId}_token_button`) return;
                if (e.target.id === `${this.tabId}_lora_edit_user_metadata_button`) return;
                if (e.target.className === "global-popup-close") return;
                if (e.target.id.indexOf("_interrupt") > 0) {
                    this.finally();
                    return;
                }
            }

            const updatedText = this.makeUpdatedText();
            const changed = this.lastText != updatedText;
            if (changed) {
                if (!this.usingExecCommand) {
                    this.textarea.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
                } else {
                    this.updateWithExecCommand(updatedText);
                }
            }
            this.save();
            this.finally();
        };

        cancel = (e) => {
            if (e.key === 'Escape') {
                if (!this.usingExecCommand) {
                    this.update(this.lastText);
                }
                this.finally();
            }
        };

        finally() {
            weight_helper_preview_info[this.nameHash] = this.previewInfo;

            last_instance = undefined;
            this.releaseFunctions.forEach((f) => f());
            this.mainBody.remove();
        }
    }

    async function postAPI(url, body) {
        let response = await fetch(url, { method: "POST", body: body });
        if (response.status != 200) {
            console.error(`Error posting to API endpoint "${url}": ` + response.status, response.statusText);
            return null;
        }
        return await response.json();
    }

    function withoutTAC(func) {
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

        const oldData = JSON.parse(localStorage.getItem("weight_helper"));
        const oldDataType = JSON.parse(localStorage.getItem("weight_helper_type"));
        try {
            if (oldData && Object.keys(oldData).length > 0) {
                Object.entries(oldData).forEach(kv => {
                    const key = kv[0];
                    const datas = kv[1];

                    delete dataTemp[key]
                    const sdType = oldDataType[key];

                    let lbwSdVersion = sdType == "sdxl" ? "SDXL" : "SD";
                    datas.forEach(data => {
                        delete data.VERSION;
                        delete data.DATE;
                        if (data.unet[0] != null) {
                            data.use_unet = true;
                        } else {
                            data.use_unet = false;
                            data.unet[0] = 0;
                        }
                        if (data.dyn[0] != null) {
                            data.use_dyn = true;
                        } else {
                            data.use_dyn = false;
                            data.dyn[0] = 0;
                        }
                        data.stop = [null];
                        data.special = "";
                        data.lbw_lora_type = "lora";
                        data.lbw_sd_version = lbwSdVersion;
                    });
                    dataTemp[key] = { lock: [] }
                    dataTemp[key].history = datas;
                    dataTemp[key].lora_info = {
                        "selected_lora_type": {
                            "lbw_lora_type": "lora",
                            "lbw_sd_version": lbwSdVersion
                        }
                    }
                });
            }
            localStorage.removeItem("weight_helper");
            localStorage.removeItem("weight_helper_type");
        } catch (error) {
            console.error("An error occurred:", error);
        }

        weight_helper_data = dataTemp;
        Object.entries(dataTemp).forEach(kv => {
            const key = kv[0];
            if (key === "VERSION") {
                return;
            }
            const val = kv[1];
            weight_helper_data[key].lock = val.lock.map(v => new WeightData(v));
            weight_helper_data[key].history = val.history.map(v => new WeightData(v));
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
                    if (last_instance) {
                        last_instance.close();
                    }
                }, true);
            });
            const textareas = gradioApp().querySelectorAll("*:is([id*='_toprow'] [id*='_prompt'], .prompt) textarea");
            textareas.forEach((textarea) => {
                WeightHelper.attach(textarea);
            });
        });
        fetch('https://code.jquery.com/jquery-3.6.0.min.js')
            .then(res => res.text())
            .then(script => {
                new Function(script)();
                jq = jQuery.noConflict(true);
            })
            .catch(error => console.error('Error loading jQuery:', error));

        async function loadHandlebars() {
            if ("Handlebars" in window) {
                return Promise.resolve();
            } else {
                try {
                    const res = await fetch("https://cdn.jsdelivr.net/npm/handlebars@latest/dist/handlebars.js");
                    const script = await res.text();
                    new Function(script).call(window);

                    Handlebars.registerHelper("lower", str => str.toLowerCase());
                    Handlebars.registerHelper("visible", b => b ? "" : "visibility: hidden;");
                    Handlebars.registerHelper("display", b => b ? "" : "display: none;");
                    Handlebars.registerHelper("checked", b => b ? "checked" : "");
                    Handlebars.registerHelper("selected", b => b ? "selected" : "");
                    Handlebars.registerHelper("pos", array => {
                        let str = "";
                        str += array[0] == null ? "" : `top: ${array[0]}px;`;
                        str += array[1] == null ? "" : `right: ${array[1]}px;`;
                        str += array[2] == null ? "" : `bottom: ${array[2]}px;`;
                        str += array[3] == null ? "" : `left: ${array[3]}px;`;
                        return str;
                    })
                } catch (error) {
                    console.error("Failed to load Handlebars:", error);
                }
            }
        }
        loadHandlebars().then(() => {
            fetch("/whapi/v1/get_template", { method: "POST", body: null })
                .then(res => res.json())
                .then(hbs => {
                    function partialize(hbs, tag) {
                        const startTag = tag;
                        const start = hbs.indexOf(startTag);
                        const endTag = `${tag.substring(0, 1)}/${tag.substring(1)}`;
                        const end = hbs.indexOf(endTag, start + startTag.length);
                        const partial = hbs.substring(start + startTag.length, end);
                        const main = hbs.substring(0, start) + hbs.substring(end + endTag.length);
                        return {"partial": partial, "main": main}
                    }
                    let main, preview, preset, lbwBlock, lbw;
                    ({ partial: preview, main: main} = partialize(hbs, "<wh:preview>"));
                    ({ partial: preset, main: main} = partialize(main, "<wh:lbwpresets>"));
                    ({ partial: lbwBlock, main: main} = partialize(main, "<wh:lbwblocks>"));
                    ({ partial: lbw, main: lbwBlock} = partialize(lbwBlock, "<wh:lbws>"));
                    WeightHelper.MAIN_TEMPLATE = Handlebars.compile(main);
                    WeightHelper.PREVIEW_TEMPLATE = Handlebars.compile(preview);
                    WeightHelper.PRESETS_TEMPLATE = Handlebars.compile(preset);
                    WeightHelper.LBWBLOCKS_TEMPLATE = Handlebars.compile(lbwBlock);
                    WeightHelper.LBWS_TEMPLATE = Handlebars.compile(lbw);
                })
            }
        );
    });
})();
