'use strict';

const VERSION = "1.2.0"
var weight_helper_history = JSON.parse(localStorage.getItem("weight_helper"));
var weight_helper_type = JSON.parse(localStorage.getItem("weight_helper_type"));

class WeightHelper {

    static REGEX = /<([^:]+):([^:]+):([^>]+)>/;

    static SUPPORT_TYPE = new Set(["lora", "lyco"]);

    static SPECIAL_KEYWORDS = ["XYZ"];

    static last_instance = undefined;

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
    LBW_WEIGHT_TAGS = [
        { type: "lora", label: "LoRA" },
        { type: "lyco", label: "LyCORIS" }
    ];
    LBW_WEIGHT_TYPES = [
        { type: "", label: "Default" },
        { type: "sdxl", label: "SDXL" },
        { type: "all", label: "ALL" }
    ];
    LBW_WEIGHT_SETTINGS = {
        lora: {
            "": {
                enable_blocks: [1,0,1,1,0,1,1,0,1,1,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN01-IN04", "IN05-IN08", "M00", "OUT03-OUT06", "OUT07-OUT11"]
            },
            "sdxl": {
                enable_blocks: [1,0,0,0,0,1,1,0,1,1,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
                block_points: ["BASE", "IN04-IN08", "M00", "OUT00-OUT05"]
            },
            "all": {
                enable_blocks: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN00-IN05", "IN06-IN11", "M00", "OUT00-OUT05", "OUT06-OUT11"]
            }
        },
        lyco: {
            "": {
                enable_blocks: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN00-IN05", "IN06-IN11", "M00", "OUT00-OUT05", "OUT06-OUT11"]
            },
            "sdxl": {
                enable_blocks: [1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
                block_points: ["BASE", "IN00-IN03", "IN04-IN08", "M00", "OUT00-OUT03", "OUT04-OUT8"]
            },
            "all": {
                enable_blocks: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN00-IN05", "IN06-IN11", "M00", "OUT00-OUT05", "OUT06-OUT11"]
            }
        }
    };

    usingExecCommand = false;

    currentDate = null;
    historyLimitDate = null;

    offsetX = 0;
    offsetY = 0;
    isDragging = false;

    lbwPresetsMap = {};
    lbwPresetsValueKeyMap = {};

    weightTag = null;
    weightType = "";
    name = null;
    nameHash = null;
    weightData = {};

    lastSelectionStart = null;
    lastSelectionEnd = null;
    lastText = null;

    historyIndex = 0;

    customContextMenu = null;

    lbwPresetSelect = null;
    lbwGroupWrapper = null;
    weightUIs = {};

    opened = false;
    addedTempWeightData = false;

    constructor(tabId, textarea, selectionStart, selectionEnd, type, name, allWeights) {
        this.tabId = tabId;
        this.textarea = textarea;
        this.lastSelectionStart = selectionStart;
        this.lastSelectionEnd = selectionEnd;
        this.lastText = this.textarea.value.substring(this.lastSelectionStart, this.lastSelectionEnd);

        this.currentDate = this.#getCurrentDate();
        this.historyLimitDate = this.#getDateBeforeDays(this.currentDate, 20);

        this.weightTag = type;
        this.name = name;
        this.nameHash = this.#hashCode(name);

        const optBlockPattern = /((BASE|MID|M00|(IN|OUT)[0-9]{2}(-(IN|OUT)[0-9]{2})?) *(, *|$))+/;
        for (let weightTag of this.LBW_WEIGHT_TAGS) {
            for (let weightType of this.LBW_WEIGHT_TYPES) {
                try {
                    let optBlockPoints = opts[`weight_helper_lbw_${weightTag.type}_${weightType.type}_block_points`]
                    optBlockPoints = optBlockPoints.replace("MID", "M00");
                    if (optBlockPattern.exec(optBlockPoints)) {
                        const blockPoints = optBlockPoints.split(',').map((v) => v.trim());
                        this.LBW_WEIGHT_SETTINGS[weightTag.type][weightType.type].block_points = blockPoints;
                    }
                } catch (e) {
                    console.warn(`${weightTag.type}_${weightType.type} block definition format is invalid.`, e);
                }
            }
        }

        this.#init(allWeights);

        this.#initContextMenuHeader();

        if (opts.weight_helper_show_preview) {
            this.#makePreview();
        }

        this.#initContextMenuBody();
        this.#makeLbwGroupWrapper();

        if (opts.weight_helper_using_execCommand) {
            if (typeof document.execCommand === 'function') {
                this.usingExecCommand = true;
            } else {
                console.warn("execCommand is not supported.");
            }
        }
    }

    #hashCode(s) {
        let hash = 0;
        if (s.length === 0) return hash;
        for (let i = 0; i < s.length; i++) {
            const char = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    #getCurrentDate() {
        var date = new Date();
        var year = date.getFullYear();
        var month = ("0" + (date.getMonth() + 1)).slice(-2);
        var day = ("0" + date.getDate()).slice(-2);
        return year + month + day;
    }

    #getDateBeforeDays(currentDate, days) {
        let date = new Date(currentDate.substring(0, 4), currentDate.substring(4, 6) - 1, currentDate.substring(6, 8));
        date.setDate(date.getDate() - days);
        let year = date.getFullYear();
        let month = ("0" + (date.getMonth() + 1)).slice(-2);
        let day = ("0" + date.getDate()).slice(-2);
        return year + month + day;
    }

    #areWeightDataEqual(orgWeight1, orgWeight2) {
        const clean = (weight) => {
            delete weight.VERSION;
            delete weight.is_bookmarked;
            if (!weight.use_unet) {
                weight.unet = undefined;
            }
            if (!weight.use_dyn) {
                weight.dyn = undefined;
            }
            if (weight.stop == this.WEIGHT_SETTINGS.stop.default) {
                weight.stop = undefined;
            }
            return weight;
        }
        const weight1 = clean(structuredClone(orgWeight1));
        const weight2 = clean(structuredClone(orgWeight2));

        const keys1 = Object.keys(weight1);
        const keys2 = Object.keys(weight2);
        if (keys1.length !== keys2.length) {
            return false;
        }
        if (weight1.lbw.length !== weight2.lbw.length) {
            return false;
        }

        return keys1.every(key => {
            if (weight1[key] == null || weight2[key] == null) {
                if (weight1[key] != null || weight2[key] != null) {
                    return false;
                }
                return true;
            }
            if (key === "lbw") {
                for (let i = 0; i < weight1.lbw.length; i++) {
                    if (weight1.lbw[i] !== weight2.lbw[i]) {
                        return false;
                    }
                }
                return true;
            } else {
                return weight1[key][0] === weight2[key][0];
            }
        });
    }

    #init(allWeights) {
        if (!weight_helper_type) {
            weight_helper_type = {};
        }

        const samplingSteps = gradioApp().getElementById(`${this.tabId}_steps`).querySelector("input");
        if (samplingSteps) {
            const samplingStepsValue = parseInt(samplingSteps.value) * 100;
            this.WEIGHT_SETTINGS.start.max = samplingStepsValue;
            this.WEIGHT_SETTINGS.stop.max = samplingStepsValue;
            this.WEIGHT_SETTINGS.stop.default = samplingStepsValue;
        }

        const lbwPreset = gradioApp().getElementById("lbw_ratiospreset").querySelector("textarea");
        let lbwPresetValue = lbwPreset.value;
        if (!lbwPresetValue) {
            lbwPresetValue = "";
        }
        const lbwPresets = lbwPresetValue.split("\n").filter(e => e.trim() !== '');
        for (const weightTag of this.LBW_WEIGHT_TAGS) {
            this.lbwPresetsMap[weightTag.type] = {};
            this.lbwPresetsValueKeyMap[weightTag.type] = {};
            for (const weightType of this.LBW_WEIGHT_TYPES) {
                let lbwPreset = {};
                let lbwPresetValueKey = {};

                this.lbwPresetsMap[weightTag.type][weightType.type] = lbwPreset;
                this.lbwPresetsValueKeyMap[weightTag.type][weightType.type] = lbwPresetValueKey;

                const enableBlocks = this.LBW_WEIGHT_SETTINGS[weightTag.type][weightType.type].enable_blocks;
                const blockLength = enableBlocks.filter((b) => b == 1).length;
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
        const weightBlocksArray = allWeights.split(":");
        let isTypeDetermined = false;
        for (let i = 0; i < weightBlocksArray.length; i++) {
            let weightKeyVal = weightBlocksArray[i].split("=");
            let keyType;
            let blocks;
            if (weightKeyVal.length > 1) {
                keyType = weightKeyVal[0].toLowerCase();
                blocks = weightKeyVal[1];
            } else {
                keyType = keyTypes[i];
                blocks = weightKeyVal[0];
            }
            if (keyType === "lbw") {
                blocks = weightKeyVal[1].split(',');

                if (blocks.length === 1 && WeightHelper.SPECIAL_KEYWORDS.includes(blocks[0])) {
                    this.weightData.special = blocks[0];
                }

                for (const weightType of this.LBW_WEIGHT_TYPES) {
                    const lbwPresets = this.lbwPresetsMap[this.weightTag][weightType.type];
                    if (blocks in lbwPresets) {
                        blocks = lbwPresets[blocks].split(',');
                        break;
                    }
                }

                const lbwDefault = this.WEIGHT_SETTINGS.lbw.default;
                for (const weightType of this.LBW_WEIGHT_TYPES) {
                    const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightTag][weightType.type];
                    const enableBlocks = lbwWeightSetting.enable_blocks;
                    if (blocks.length === enableBlocks.filter((b) => b == 1).length) {
                        this.weightType = weightType.type;
                        isTypeDetermined = true;
                        let refIdx = 0;
                        for (let enable of enableBlocks) {
                            if (enable) {
                                this.weightData.lbw.push(parseInt(blocks[refIdx] * 100));
                                refIdx++;
                            } else {
                                this.weightData.lbw.push(lbwDefault);
                            }
                        }
                        break;
                    }
                }
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

        if (!isTypeDetermined) {
            if (this.nameHash in weight_helper_type) {
                this.weightType = weight_helper_type[this.nameHash]
            }
        }
        if (!this.weightData.lbw.length) {
            const enableBlocks = this.LBW_WEIGHT_SETTINGS[this.weightTag][this.weightType].enable_blocks;
            for (let _ of enableBlocks) {
                this.weightData.lbw.push(100);
            }
        }

        this.weightData.is_bookmarked = false;

        if (!weight_helper_history) {
            weight_helper_history = {};
        }
        if (!(this.nameHash in weight_helper_history)) {
            weight_helper_history[this.nameHash] = [];
        }
        weight_helper_history[this.nameHash] = weight_helper_history[this.nameHash].filter(v => v.VERSION >= VERSION);
        if (weight_helper_history[this.nameHash].length == 0) {
            weight_helper_history[this.nameHash].push(structuredClone(this.weightData));
        } else {
            const lastWeightData = weight_helper_history[this.nameHash].at(-1);
            if (this.#areWeightDataEqual(lastWeightData, this.weightData)) {
                if (lastWeightData.is_bookmarked) {
                    weight_helper_history[this.nameHash].push(structuredClone(this.weightData));
                    this.addedTempWeightData = true;
                }
            } else {
                weight_helper_history[this.nameHash].push(structuredClone(this.weightData));
                if (this.weightData.special) {
                    this.addedTempWeightData = true;
                }
            }
        }
        this.historyIndex = weight_helper_history[this.nameHash].length - 1;
    }

    #initContextMenuHeader() {

        this.customContextMenu = document.createElement('div');
        this.customContextMenu.id = 'weight-helper';

        let scale = opts.weight_helper_context_menu_scale;
        if (scale <= 0) {
            scale = 1;
        }
        this.customContextMenu.style.transform = `scale(${scale})`;

        const header = document.createElement('header');

        const headerTitle = document.createElement('span');
        header.appendChild(headerTitle);

        const bookmark = document.createElement('span');
        bookmark.classList.add("bookmark", this.weightData.is_bookmarked ? "like" : "unlike");
        headerTitle.prepend(bookmark);
        bookmark.addEventListener("click", (e) => {
            const weightData = weight_helper_history[this.nameHash][this.historyIndex];
            const clsList = e.target.classList;
            const lk = clsList.item(1);
            clsList.remove(lk);
            if (lk === "like") {
                weightData.is_bookmarked = false;
                clsList.add("unlike");
            } else {
                weightData.is_bookmarked = true;
                clsList.add("like");
            }
        });

        const headerLabel = document.createElement('label');
        headerLabel.classList.add("name")
        headerLabel.textContent = this.name;
        headerTitle.appendChild(headerLabel);

        const history = document.createElement('div');
        history.classList.add("history");
        header.appendChild(history);

        const pageWrapper = document.createElement('div');
        pageWrapper.classList.add("page");
        history.appendChild(pageWrapper);

        const pageLabel = document.createElement('label');
        pageLabel.textContent = (this.historyIndex + 1) + "/" + weight_helper_history[this.nameHash].length;

        const restoreFromHistory = () => {
            pageLabel.textContent = (this.historyIndex + 1) + "/" + weight_helper_history[this.nameHash].length;
            this.weightData = structuredClone(weight_helper_history[this.nameHash][this.historyIndex]);

            Object.keys(this.weightData).map(key => {
                if (["VERSION", "DATE"].includes(key)) {
                    return;
                }
                if (["stop"].includes(key)) {
                    if (!this.weightData[key]) {
                        this.weightData[key] = [this.WEIGHT_SETTINGS[key].default];
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
                            if (val) {
                                show = val[0] != this.WEIGHT_SETTINGS[key].default;
                            }
                        }
                        if (!this.opened && isExtraType) {
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

            if (this.weightData.special) {
                this.lbwPresetSelect.value = this.weightData.special;
                this.lbwGroupWrapper.style.display = "none";
            } else {
                const lbwValues = this.#lbwWeightData().join(",");
                if (lbwValues in this.lbwPresetsValueKeyMap[this.weightTag][this.weightType]) {
                    this.lbwPresetSelect.value = lbwValues;
                } else {
                    this.lbwPresetSelect.selectedIndex = 0;
                }
                this.lbwGroupWrapper.style.display = "flex";
            }

            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText();
                this.#update(updatedText);
            }

            const lk = bookmark.classList.item(1);
            bookmark.classList.remove(lk);
            if (this.weightData.is_bookmarked) {
                bookmark.classList.add("like");
            } else {
                bookmark.classList.add("unlike");
            }
        }

        const pageLeft = document.createElement('a');
        pageLeft.textContent = "<";
        pageLeft.classList.add("icon");
        pageWrapper.appendChild(pageLeft);
        pageLeft.addEventListener("click", () => {
            if (this.historyIndex <= 0) {
                return;
            }
            this.historyIndex--;
            restoreFromHistory();
        });

        pageWrapper.appendChild(pageLabel);

        const pageRight = document.createElement('a');
        pageRight.textContent = ">";
        pageRight.classList.add("icon");
        pageWrapper.appendChild(pageRight);
        pageRight.addEventListener("click", () => {
            if (this.historyIndex >= weight_helper_history[this.nameHash].length - 1) {
                return;
            }
            this.historyIndex++;
            restoreFromHistory();
        });

        this.customContextMenu.appendChild(header);

        this.customContextMenu.addEventListener('mousedown', (e) => {
            if (e.target.closest('header')) {
                this.isDragging = true;
                this.offsetX = e.clientX - this.customContextMenu.getBoundingClientRect().left;
                this.offsetY = e.clientY - this.customContextMenu.getBoundingClientRect().top;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const x = e.clientX - this.offsetX + window.scrollX;
            const y = e.clientY - this.offsetY + window.scrollY;

            this.customContextMenu.style.left = x + 'px';
            this.customContextMenu.style.top = y + 'px';
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }

    #initContextMenuBody() {
        const children = this.customContextMenu.getElementsByTagName("section");
        while (children.length > 0) {
            children[0].parentNode.removeChild(children[0]);
        }
        const extraOpts = [];
        let hiddenExtraOpts = 0;
        for (const group of Object.keys(this.WEIGHT_SETTINGS)) {
            if (group == "lbw") {
                break;
            }

            const weightSetting = this.WEIGHT_SETTINGS[group];

            this.weightUIs[group] = {slider: [], updown: []};

            const section = document.createElement('section');
            section.classList.add("border");

            const labelContainer = document.createElement("span");
            const label = document.createElement('label');
            label.textContent = weightSetting.label;
            labelContainer.appendChild(label);
            section.appendChild(labelContainer);
            section.appendChild(this.#makeSliderComponent(labelContainer, null, group, 0));

            if (weightSetting.label === "TEnc") {
                this.customContextMenu.appendChild(section);
            } else {
                extraOpts.push(section);
                const defVal = this.WEIGHT_SETTINGS[group].default;
                const weightUI = this.weightUIs[group];
                if ("use_check" in weightUI && !weightUI.use_check.checked ||
                        defVal !== undefined && this.weightData[group][0] === defVal) {
                    section.style.display = 'none';
                    hiddenExtraOpts++;
                }
                this.customContextMenu.appendChild(section);
            }
        }

        if (hiddenExtraOpts > 0) {
            const extraButton = document.createElement('button');
            extraButton.classList.add("secondary", "gradio-button");
            extraButton.id = "weight-helper-show-extra-opt-button";
            extraButton.textContent = "show extra options";
            extraButton.addEventListener("click", (e) => {
                e.target.remove();
                for (const extra of extraOpts) {
                    extra.style.display = '';
                }
                this.opened = true;
            });
            this.customContextMenu.appendChild(extraButton);
        }

        const group = "lbw";

        this.weightUIs[group] = {slider: [], updown: [], dom: []};

        const lbwSection = document.createElement('section');
        lbwSection.classList.add("border");

        const label = document.createElement('label');
        label.textContent = group.toUpperCase();
        lbwSection.appendChild(label);

        const lbwSet = document.createElement('div');
        lbwSet.classList.add('f', 'col', 'g-4', 'w-fill');
        lbwSection.appendChild(lbwSet);

        const typeRow = document.createElement("div");
        typeRow.classList.add("f", "g-2", "f-end");

        const lbwTagSelect = document.createElement("select");
        lbwTagSelect.style.flexGrow = 1;
        for (const weightTag of this.LBW_WEIGHT_TAGS) {
            const lbwTagOpt = document.createElement('option');
            lbwTagOpt.value = weightTag.type;
            lbwTagOpt.text = weightTag.label;
            lbwTagSelect.appendChild(lbwTagOpt);
        }
        lbwTagSelect.value = this.weightTag;
        lbwTagSelect.addEventListener("change", (e) => {
            this.weightTag = e.target.value;
            this.#makeLbwGroupWrapper();
            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText();
                this.#update(updatedText);
            }
        });
        typeRow.appendChild(lbwTagSelect);

        const typeTypeRow = document.createElement("div");
        typeTypeRow.classList.add("border", "f", "g-2", "f-end");

        const typeType = document.createElement("div");
        typeType.classList.add("f", "g-2", "f-end");
        for (const weightType of this.LBW_WEIGHT_TYPES) {
            const radioId = "weight-helper-detail_" + weightType.type;
            const weightTypeRadio = document.createElement("input");
            weightTypeRadio.id = radioId;
            weightTypeRadio.type = "radio";
            weightTypeRadio.name = "weight-helper-detail";
            weightTypeRadio.value = weightType.type;
            weightTypeRadio.checked = weightType.type == this.weightType;
            weightTypeRadio.addEventListener("change", (e) => {
                this.weightType = e.target.value;
                this.#makeLbwGroupWrapper();
                if (!this.usingExecCommand) {
                    const updatedText = this.#getUpdatedText();
                    this.#update(updatedText);
                }
            });
            typeType.appendChild(weightTypeRadio);

            const weightTypeLabel = document.createElement("label");
            weightTypeLabel.classList.add("radio-label");
            weightTypeLabel.textContent = weightType.label;
            weightTypeLabel.htmlFor = radioId;
            typeType.appendChild(weightTypeLabel);
        }
        typeTypeRow.appendChild(typeType);

        typeRow.appendChild(typeTypeRow);
        lbwSet.appendChild(typeRow);

        this.lbwPresetSelect = document.createElement('select');
        lbwSet.appendChild(this.lbwPresetSelect);

        this.lbwPresetSelect.addEventListener("change", (e) => {
            const selectVal = e.target.value;
            const isSpecial = WeightHelper.SPECIAL_KEYWORDS.includes(selectVal);
            if (!isSpecial) {
                this.weightData.special = "";
                this.lbwGroupWrapper.style.display = "flex";
            } else {
                this.weightData.special = selectVal;
                this.lbwGroupWrapper.style.display = "none";
            }

            if (!isSpecial) {
                const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightTag][this.weightType];
                const enableBlocks = lbwWeightSetting.enable_blocks;
                let values;
                if (selectVal === "") {
                    values = [];
                    for (let idx = 0; idx < enableBlocks.length; idx++) {
                        if (enableBlocks[idx] === 1) {
                            const val = this.weightData.lbw[idx];
                            values.push(val);
                        }
                    }
                } else {
                    values = selectVal.split(",").map(v => Math.round(parseFloat(v) * 100));
                }
                let refIdx = 0;
                for (let idx = 0; idx < enableBlocks.length; idx++) {
                    let val = 0;
                    if (enableBlocks[idx] === 1) {
                        val = values[refIdx];
                        refIdx++;
                    }
                    this.weightData[group][idx] = val;
                    this.weightUIs[group].slider[idx].value = val;
                    this.weightUIs[group].updown[idx].value = val / 100;
                }
            }

            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText();
                this.#update(updatedText);
            }
        });

        for (let idx = 0; idx < this.weightData[group].length; idx++) {
            let lbwUnit = document.createElement('div');
            lbwUnit.classList.add('lbw-unit', `lbw-u-${idx}`);
            lbwUnit.classList.add('f', 'g-2');

            const label = document.createElement('label');
            label.textContent = this.WEIGHT_SETTINGS[group].labels[idx];
            lbwUnit.appendChild(label);
            lbwUnit.appendChild(this.#makeSliderComponent(null, this.lbwPresetSelect, group, idx));

            this.weightUIs.lbw.dom.push(lbwUnit);
        }

        this.lbwGroupWrapper = document.createElement('div');
        this.lbwGroupWrapper.classList.add('lbw-group-wrapper', 'f', 'col', 'g-2');
        if (!this.weightData.special) {
            this.lbwGroupWrapper.style.display = "flex";
        } else {
            this.lbwGroupWrapper.style.display = "none";
        }

        lbwSet.appendChild(this.lbwGroupWrapper);
        this.customContextMenu.appendChild(lbwSection);
    }

    #makeLbwGroupWrapper() {
        while (this.lbwPresetSelect.firstChild) {
            this.lbwPresetSelect.removeChild(this.lbwPresetSelect.firstChild);
        }
        const opt = document.createElement('option');
        opt.value = "";
        opt.text = "";
        this.lbwPresetSelect.appendChild(opt);

        for (const sp of WeightHelper.SPECIAL_KEYWORDS) {
            const spOpt = document.createElement('option');
            spOpt.value = sp;
            spOpt.text = sp;
            this.lbwPresetSelect.appendChild(spOpt);
        }

        if (Object.keys(this.lbwPresetsMap[this.weightTag][this.weightType]).length) {
            for (const key of Object.keys(this.lbwPresetsMap[this.weightTag][this.weightType])) {
                const opt = document.createElement('option');
                opt.text = key;
                opt.value = this.lbwPresetsMap[this.weightTag][this.weightType][key];
                this.lbwPresetSelect.appendChild(opt);
            }
        }
        this.lbwPresetSelect.value = this.#lbwWeightData();

        while (this.lbwGroupWrapper.firstChild) {
            this.lbwGroupWrapper.removeChild(this.lbwGroupWrapper.firstChild);
        }

        const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightTag][this.weightType];

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
            lbwGroup.classList.add('border', 'f', 'g-2', 'col');
            for (let idx = pointStart; idx <= pointEnd; idx++) {
                if (lbwWeightSetting.enable_blocks[idx] == 1) {
                    lbwGroup.appendChild(this.weightUIs.lbw.dom[idx]);
                }
            }
            this.lbwGroupWrapper.appendChild(lbwGroup);
        }
    }

    #lbwWeightData() {
        if (this.weightData.special) {
            return this.weightData.special;
        }
        const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightTag][this.weightType];
        const enableBlocks = lbwWeightSetting.enable_blocks;
        return this.weightData.lbw.filter((_, i) => enableBlocks[i] === 1).map(v => v / 100);
    }

    #makeSlider(group, i) {
        const value = Math.round(this.weightData[group][i]);
        const min = this.WEIGHT_SETTINGS[group].min;
        const max = this.WEIGHT_SETTINGS[group].max;
        const step = this.WEIGHT_SETTINGS[group].step;
        const slider = document.createElement('input');
        slider.classList.add('slider');
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
        valueText.classList.add('value');
        valueText.type = "number";
        valueText.step = parseFloat(step) / 100;
        valueText.value = value / 100;
        return valueText;
    }

    #makeSliderComponent(labelContainer, lbwPresetSelect, group, i) {
        const sliderContainer = document.createElement('div');
        sliderContainer.classList.add('f', 'f-c', 'g-4');

        if (labelContainer && this.WEIGHT_SETTINGS[group].default === undefined) {
            const unetVal = this.weightData[group][i];
            const useCheck = document.createElement('input');
            useCheck.addEventListener("change", (e) => {
                this.weightData[`use_${group}`] = e.target.checked;
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
            if (lbwPresetSelect && group === "lbw") {
                this.weightData.special = "";
                lbwValues = this.#lbwWeightData().join(",");
                if (lbwValues in this.lbwPresetsValueKeyMap[this.weightTag][this.weightType]) {
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
            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText();
                this.#update(updatedText);
            }
        }

        slider.addEventListener('input', (e) => {
            const fVal = parseFloat(e.target.value);
            this.weightData[group][i] = fVal;
            updown.value = Math.round(fVal) / 100;
            changedLbwValues();
        });
        updown.addEventListener('input', (e) => {
            const fVal = parseFloat(e.target.value);
            this.weightData[group][i] = fVal * 100;
            slider.value = Math.round(fVal * 100);
            changedLbwValues();
        });
        return sliderContainer;
    }

    #getUpdatedText() {
        let updatedText = `<${this.weightTag}:${this.name}`;
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
        const enableBlocks = this.LBW_WEIGHT_SETTINGS[this.weightTag][this.weightType].enable_blocks;
        for (let idx = 0; idx < enableBlocks.length; idx++) {
            if (enableBlocks[idx]) {
                lbwWeights.push(this.weightData.lbw[idx]);
            }
        }
        if (!this.weightData.special) {
            if (!lbwWeights.every(val => val === this.WEIGHT_SETTINGS.lbw.default)) {
                let rateValues = lbwWeights.map(v => v / 100).join(",");
                const lbwValues = this.#lbwWeightData().join(",");
                if (lbwValues in this.lbwPresetsValueKeyMap[this.weightTag][this.weightType]) {
                    rateValues = this.lbwPresetsValueKeyMap[this.weightTag][this.weightType][lbwValues];
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
        let tacActiveInOrg = undefined;
        if (typeof TAC_CFG !== 'undefined' && TAC_CFG) {
            tacActiveInOrg = TAC_CFG.activeIn.global
            TAC_CFG.activeIn.global = false;
        }
        this.textarea.focus();
        this.textarea.setSelectionRange(this.lastSelectionStart, this.lastSelectionEnd);
        document.execCommand("insertText", false, updatedText);
        if (typeof TAC_CFG !== 'undefined' && TAC_CFG) {
            TAC_CFG.activeIn.global = tacActiveInOrg;
        }
    }

    #trySave() {
        if (!this.weightType) {
            delete weight_helper_type[this.nameHash];
        } else {
            weight_helper_type[this.nameHash] = this.weightType;
        }
        localStorage.setItem("weight_helper_type", JSON.stringify(weight_helper_type));

        const lbwDefault = this.WEIGHT_SETTINGS.lbw.default;
        const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightTag][this.weightType];
        const enableBlocks = lbwWeightSetting.enable_blocks;
        for (let idx = 0; idx < enableBlocks.length; idx++) {
            if (enableBlocks[idx] !== 1) {
                this.weightData.lbw[idx] = lbwDefault;
            }
        }

        if (this.addedTempWeightData) {
            weight_helper_history[this.nameHash].pop();
        }
        const historyLen = weight_helper_history[this.nameHash].length;
        let lastWeightData = weight_helper_history[this.nameHash].at(-1);
        let historyChanged = false;
        if (this.historyIndex < historyLen - 1) {
            if (!weight_helper_history[this.nameHash][this.historyIndex].special) {
                const swap = weight_helper_history[this.nameHash][this.historyIndex];
                this.weightData.is_bookmarked = swap.is_bookmarked;
                if (swap.is_bookmarked) {
                    weight_helper_history[this.nameHash][this.historyIndex] = this.weightData;
                } else {
                    weight_helper_history[this.nameHash].splice(this.historyIndex, 1)[0];
                    historyChanged = true;
                }
            }
        } else {
            historyChanged = !this.#areWeightDataEqual(lastWeightData, this.weightData);
        }
        if (this.weightData.stop && this.weightData.stop[0] == this.WEIGHT_SETTINGS.stop.default) {
            this.weightData.stop = null;
        }
        if (historyChanged) {
            this.weightData.VERSION = VERSION;
            weight_helper_history[this.nameHash].push(this.weightData);
        }

        const historyClone = structuredClone(weight_helper_history);
        historyClone[this.nameHash] = historyClone[this.nameHash].filter(weightData => {
            return weightData.is_bookmarked && !weightData.special;
        });
        localStorage.setItem("weight_helper", JSON.stringify(historyClone));
    }

    async #makePreview() {
        const res = await postAPI("/whapi/v1/get_preview?key=" + encodeURIComponent(this.name), null);
        const alias = res[0];
        const previewPath = res[1];
        const description = res[2];
        const modelId = res[3];
        if (previewPath) {
            const pane = document.createElement("div");
            pane.classList.add("extra-network-pane");

            const card = document.createElement("div");
            card.classList.add("card");
            pane.appendChild(card);

            const img = document.createElement("img");
            img.classList.add("preview");
            img.setAttribute("src", previewPath);
            card.appendChild(img);

            const buttonRow = document.createElement("div");
            buttonRow.classList.add("button-row");
            card.appendChild(buttonRow);

            if (modelId) {
                const civitaiButton = document.createElement("div");
                civitaiButton.classList.add("civitai-button", "card-button");
                civitaiButton.setAttribute("title", "Open civitai");
                civitaiButton.addEventListener("click", () => window.open(`https://civitai.com/models/${modelId}`, '_blank'));
                buttonRow.appendChild(civitaiButton);
            }

            const metadataButton = document.createElement("div");
            metadataButton.classList.add("metadata-button", "card-button");
            metadataButton.setAttribute("title", "Show internal metadata");
            metadataButton.addEventListener("click", (event) => extraNetworksRequestMetadata(event, 'lora', alias));
            buttonRow.appendChild(metadataButton);

            const editButton = document.createElement("div");
            editButton.classList.add("edit-button", "card-button");
            editButton.setAttribute("title", "Edit metadata");
            editButton.addEventListener("click", (event) => extraNetworksEditUserMetadata(event, this.tabId, 'lora', alias));
            buttonRow.appendChild(editButton);

            if (description) {
                const actions = document.createElement("div");
                actions.classList.add("actions");
                card.appendChild(actions);

                const actDesc = document.createElement("span");
                actDesc.classList.add("description");
                actDesc.textContent = description;
                actions.appendChild(actDesc);
            }

            img.style.height = opts.weight_helper_preview_height + "px";
            switch (opts.weight_helper_preview_position) {
                case "Bottom Right":
                    pane.style.bottom = "0px";
                    pane.style.left = String(this.customContextMenu.clientWidth + 6) + "px";
                    break;
                case "Top Left":
                    pane.style.top = "0px"
                    pane.style.right = String(this.customContextMenu.clientWidth + 6) + "px";
                    break;
                case "Bottom Left":
                    pane.style.bottom = "0px";
                    pane.style.right = String(this.customContextMenu.clientWidth + 6) + "px";
                    break;
                default:
                    pane.style.top = "0px"
                    pane.style.left = String(this.customContextMenu.clientWidth + 6) + "px";
                    break;
            }
            this.customContextMenu.prepend(pane);
        }
    }

    show(top, left) {
        this.customContextMenu.style.top = top + 'px';
        this.customContextMenu.style.left = left + 'px';
        document.body.appendChild(this.customContextMenu);
        const diffBottom = window.innerHeight - this.customContextMenu.getBoundingClientRect().bottom;
        if (diffBottom < 0) {
            this.customContextMenu.style.top = (top + diffBottom) + 'px';
            const diffTop = this.customContextMenu.getBoundingClientRect().top;
            if (diffTop < 0) {
                this.customContextMenu.style.top = window.scrollY + 'px';
            }
        }
        document.body.addEventListener('click', this.close);
        WeightHelper.last_instance = this;
    }

    close = (e) => {
        if (!this.customContextMenu) return;
        if (e && e.target.id === `${this.tabId}_token_button`) return;
        if (e && this.customContextMenu.contains(e.target)) return;

        if (this.customContextMenu.parentNode === document.body &&
                (!e || e.target.id != "weight-helper-show-extra-opt-button")) {
            WeightHelper.last_instance = undefined;
            if (e != null && e.target.id.indexOf("_interrupt") > 0) {
                document.body.removeChild(this.customContextMenu);
                window.removeEventListener("click", this.close);
                return;
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
            this.#trySave();
            document.body.removeChild(this.customContextMenu);
            window.removeEventListener("click", this.close);
        }
    };
}

async function postAPI(url, body) {
    let response = await fetch(url, { method: "POST", body: body });
    if (response.status != 200) {
        console.error(`Error posting to API endpoint "${url}": ` + response.status, response.statusText);
        return null;
    }
    return await response.json();
}

async function getTab(tabName) {
    let tab = null;
    while (!tab) {
        tab = gradioApp().getElementById(`tab_${tabName}`);
        if (!tab) {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
    return tab;
}

document.addEventListener('DOMContentLoaded', function() {
    (async() => {
        const tabId = "txt2img";
        init(await getTab(tabId), tabId);
    })();
});

function init(_, tabId) {
    let textColor = getComputedStyle(document.documentElement).getPropertyValue('--body-text-color').trim();
    let textColorRgb = textColor.slice(1).match(/.{1,2}/g).map(hex => parseInt(hex, 16));
    let textColorRgba = [...textColorRgb, 0.3];
    document.documentElement.style.setProperty('--weight-helper-shadow', `rgba(${textColorRgba.join(",")})`);

    const genButtons = document.querySelectorAll("button:is([id*='_generate'])");
    genButtons.forEach((button) => {
        button.addEventListener('click', function(e) {
            if (WeightHelper.last_instance) {
                WeightHelper.last_instance();
            }
        }, true);
    });
    const textareas = document.querySelectorAll("*:is([id*='_toprow'] [id*='_prompt'], .prompt) textarea");
    const lbwPreset = gradioApp().getElementById("lbw_ratiospreset");
    textareas.forEach((textarea) => {
        textarea.addEventListener('contextmenu', function(e) {
            if (!lbwPreset) {
                return;
            }
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
                const type = match[1].toLowerCase();
                const name = match[2];
                const weights = match[3];

                if (WeightHelper.SUPPORT_TYPE.has(type)) {
                    e.preventDefault();

                    const selectionStart = tmpSelectionStart + match.index;
                    const selectionEnd = selectionStart + match.input.trim().length;
                    const lastWeightInfo = new WeightHelper(tabId, e.target, selectionStart, selectionEnd, type, name, weights);
                    lastWeightInfo.show(e.pageY + 15, e.pageX);
                }
            }
        });
    })
}
