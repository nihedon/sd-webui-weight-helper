'use strict';

const VERSION = "1.1.0"
var weight_helper_history = JSON.parse(localStorage.getItem("weight_helper"));
var weight_helper_type = JSON.parse(localStorage.getItem("weight_helper_type"));

class WeightHelper {

    static REGEX = /<([^:]+):([^:]+):([^>]+)>/;

    static SUPPORT_TYPE = new Set(["lora", "lyco"]);

    static weight_helper_history = JSON.parse(localStorage.getItem("weight_helper"));

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
            labels: ["BASE", "IN00", "IN01", "IN02", "IN03", "IN04", "IN05", "IN06", "IN07", "IN08", "IN09", "IN10", "IN11", "MID", "OUT00", "OUT01", "OUT02", "OUT03", "OUT04", "OUT05", "OUT06", "OUT07", "OUT08", "OUT09", "OUT10", "OUT11"],
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
                block_points: ["BASE", "IN01-IN04", "IN05-IN08", "MID", "OUT03-OUT06", "OUT07-OUT11"]
            },
            "sdxl": {
                enable_blocks: [1,0,0,0,0,1,1,0,1,1,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
                block_points: ["BASE", "IN04-IN08", "MID", "OUT00-OUT05"]
            },
            "all": {
                enable_blocks: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN00-IN05", "IN06-IN11", "MID", "OUT00-OUT05", "OUT06-OUT11"]
            }
        },
        lyco: {
            "": {
                enable_blocks: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN00-IN05", "IN06-IN11", "MID", "OUT00-OUT05", "OUT06-OUT11"]
            },
            "sdxl": {
                enable_blocks: [1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
                block_points: ["BASE", "IN00-IN03", "IN04-IN08", "MID", "OUT00-OUT03", "OUT04-OUT8"]
            },
            "all": {
                enable_blocks: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                block_points: ["BASE", "IN00-IN05", "IN06-IN11", "MID", "OUT00-OUT05", "OUT06-OUT11"]
            }
        }
    };

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
    cleared = false;

    customContextMenu = null;

    lbwPresetSelect = null;
    lbwGroupWrapper = null;
    weightUIs = {};

    usingExecCommand = false;

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

        const optBlockPattern = /((BASE|MID|(IN|OUT)[0-9]{2}(-(IN|OUT)[0-9]{2})?) *(, *|$))+/;
        for (let weightTag of this.LBW_WEIGHT_TAGS) {
            for (let weightType of this.LBW_WEIGHT_TYPES) {
                try {
                    const optBlockPoints = opts[`weight_helper_lbw_${weightTag.type}_${weightType.type}_block_points`]
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
            (async() => {
                const previewPath = await postAPI("/whapi/v1/get_preview?key=" + this.name, null);
                if (previewPath) {
                    const thumb = document.getElementById("weight-helper-thumb");

                    thumb.style.maxHeight = opts.weight_helper_preview_max_height + "px";
                    switch (opts.weight_helper_preview_position) {
                        case "Bottom Right":
                            thumb.style.bottom = "0px";
                            thumb.style.left = String(this.customContextMenu.clientWidth + 6) + "px";
                            break;
                        case "Top Left":
                            thumb.style.top = "0px"
                            thumb.style.right = String(this.customContextMenu.clientWidth + 6) + "px";
                            break;
                        case "Bottom Left":
                            thumb.style.bottom = "0px";
                            thumb.style.right = String(this.customContextMenu.clientWidth + 6) + "px";
                            break;
                        default:
                            thumb.style.top = "0px"
                            thumb.style.left = String(this.customContextMenu.clientWidth + 6) + "px";
                            break;
                    }
                    thumb.src = "./sd_extra_networks/thumb?filename=" + encodeURI(previewPath);
                }
            })();
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

    #init(allWeights) {
        if (!weight_helper_type) {
            weight_helper_type = {};
        }

        const samplingSteps = gradioApp().getElementById("txt2img_steps").querySelector("input");
        if (samplingSteps) {
            const samplingStepsValue = parseInt(samplingSteps.value) * 100;
            this.WEIGHT_SETTINGS.start.max = samplingStepsValue;
            this.WEIGHT_SETTINGS.stop.max = samplingStepsValue;
            this.WEIGHT_SETTINGS.stop.default = samplingStepsValue;
        }

        const lbwPreset = gradioApp().getElementById("lbw_ratiospreset").querySelector("textarea");
        if (lbwPreset && lbwPreset.value) {
            const lbwPresets = lbwPreset.value.split("\n");
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
        }

        for (const weightType of Object.keys(this.WEIGHT_SETTINGS)) {
            this.weightData[weightType] = []
            this.weightData[weightType].push(this.WEIGHT_SETTINGS[weightType].default);
        }
        this.weightData.lbw = [];
        this.weightData.lbwe = [];

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
                for (const weightType of this.LBW_WEIGHT_TYPES) {
                    const lbwPresets = this.lbwPresetsMap[this.weightTag][weightType.type];
                    if (blocks in lbwPresets) {
                        blocks = lbwPresets[blocks].split(',');
                        break;
                    }
                }
                for (const weightType of this.LBW_WEIGHT_TYPES) {
                    const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightTag][weightType.type];
                    const enableBlocks = lbwWeightSetting.enable_blocks;
                    if (blocks.length == enableBlocks.filter((b) => b == 1).length) {
                        this.weightType = weightType.type;
                        isTypeDetermined = true;
                        let refIdx = 0;
                        for (let enable of enableBlocks) {
                            if (enable) {
                                this.weightData.lbw.push(blocks[refIdx] * 100);
                                refIdx++;
                            } else {
                                this.weightData.lbw.push(0);
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
                this.weightData[keyType][0] = blocks * 100;
            }
        }
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

        if (!WeightHelper.weight_helper_history) {
            WeightHelper.weight_helper_history = {};
        }
        if (!(this.nameHash in WeightHelper.weight_helper_history)) {
            WeightHelper.weight_helper_history[this.nameHash] = [];
        }
        WeightHelper.weight_helper_history[this.nameHash] = WeightHelper.weight_helper_history[this.nameHash]
                .filter(v => v.VERSION == VERSION).filter(v => v.DATE >= this.historyLimitDate);
        if (WeightHelper.weight_helper_history[this.nameHash].length == 0) {
            const history = {};
            this.#copyWeight(this.weightData, history);
            WeightHelper.weight_helper_history[this.nameHash].push(history);
        }
        this.historyIndex = WeightHelper.weight_helper_history[this.nameHash].length - 1;
    }

    #initContextMenuHeader() {

        this.customContextMenu = document.createElement('div');
        this.customContextMenu.id = 'weight-helper';

        let scale = opts.weight_helper_context_menu_scale;
        if (scale <= 0) {
            scale = 1;
        }
        this.customContextMenu.style.transform = `scale(${scale})`;

        const thumb = document.createElement("img");
        thumb.id = "weight-helper-thumb";
        this.customContextMenu.appendChild(thumb);

        const header = document.createElement('header');

        const headerLabel = document.createElement('label');
        headerLabel.textContent = this.name;
        header.appendChild(headerLabel);

        const history = document.createElement('div');
        history.classList.add("history");
        header.appendChild(history);

        const clear = document.createElement('a');
        clear.classList.add("clear");
        clear.textContent = "clear";
        clear.addEventListener("click", () => {
            this.cleared = true;
            pageLabel.textContent = "0/0";
            this.historyIndex = -1;
            WeightHelper.weight_helper_history[this.nameHash] = [];
        });
        history.appendChild(clear);

        const pageWrapper = document.createElement('div');
        pageWrapper.classList.add("page");
        history.appendChild(pageWrapper);

        const pageLeft = document.createElement('a');
        pageLeft.textContent = "<";
        pageLeft.classList.add("icon");
        pageWrapper.appendChild(pageLeft);
        pageLeft.addEventListener("click", () => {
            if (this.historyIndex <= 0) {
                return;
            }
            this.historyIndex--;
            pageLabel.textContent = (this.historyIndex + 1) + "/" + WeightHelper.weight_helper_history[this.nameHash].length;
            this.#copyWeight(WeightHelper.weight_helper_history[this.nameHash][this.historyIndex], this.weightData);
            Object.keys(this.weightData).map(key => {
                for (const idx in this.weightData[key]) {
                    const fVal = this.weightData[key][idx];
                    if (key in this.weightUIs) {
                        this.weightUIs[key].slider[idx].value = fVal;
                        this.weightUIs[key].updown[idx].value = fVal / 100;
                    }
                }
            });
            if (!this.usingExecCommand) {
                const lbwValues = this.#lbwWeightData().join(",");
                const updatedText = this.#getUpdatedText(lbwValues);
                this.#update(updatedText);
            }
        });

        const pageLabel = document.createElement('label');
        pageLabel.textContent = (this.historyIndex + 1) + "/" + WeightHelper.weight_helper_history[this.nameHash].length;
        pageWrapper.appendChild(pageLabel);

        const pageRight = document.createElement('a');
        pageRight.textContent = ">";
        pageRight.classList.add("icon");
        pageWrapper.appendChild(pageRight);
        pageRight.addEventListener("click", () => {
            if (this.historyIndex >= WeightHelper.weight_helper_history[this.nameHash].length - 1) {
                return;
            }
            this.historyIndex++;
            pageLabel.textContent = (this.historyIndex + 1) + "/" + WeightHelper.weight_helper_history[this.nameHash].length;
            this.#copyWeight(WeightHelper.weight_helper_history[this.nameHash][this.historyIndex], this.weightData);
            Object.keys(this.weightData).map(key => {
                for (const idx in this.weightData[key]) {
                    const fVal = this.weightData[key][idx];
                    if (key in this.weightUIs) {
                        this.weightUIs[key].slider[idx].value = fVal;
                        this.weightUIs[key].updown[idx].value = fVal / 100;
                    }
                }
            });
            if (!this.usingExecCommand) {
                const lbwValues = this.#lbwWeightData().join(",");
                const updatedText = this.#getUpdatedText(lbwValues);
                this.#update(updatedText);
            }
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

            const label = document.createElement('label');
            label.textContent = weightSetting.label;
            section.appendChild(label);

            const sliderContainer = document.createElement('div');
            sliderContainer.classList.add('f', 'f-c', 'g-4');
            this.#makeSliderComponent(sliderContainer, null, group, 0);
            section.appendChild(sliderContainer);

            if (weightSetting.label === "TEnc") {
                this.customContextMenu.appendChild(section);
            } else {
                extraOpts.push(section);
                const defVal = this.WEIGHT_SETTINGS[group].default;
                const weightUI = this.weightUIs[group];
                if ("active_checkbox" in weightUI && !weightUI.active_checkbox.checked ||
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
            if (e.target.value === "") {
                return;
            }

            const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightTag][this.weightType];
            const enableBlocks = lbwWeightSetting.enable_blocks;
            const values = e.target.value.split(",").map(v => Math.round(parseFloat(v) * 100));
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

            if (!this.usingExecCommand) {
                const lbwValues = this.#lbwWeightData().join(",");
                const updatedText = this.#getUpdatedText(lbwValues);
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

            const sliderContainer = document.createElement('div');
            sliderContainer.classList.add('f', 'f-c', 'g-4');
            this.#makeSliderComponent(sliderContainer, this.lbwPresetSelect, group, idx);
            lbwUnit.appendChild(sliderContainer);

            this.weightUIs.lbw.dom.push(lbwUnit);
        }

        this.lbwGroupWrapper = document.createElement('div');
        this.lbwGroupWrapper.classList.add('lbw-group-wrapper', 'f', 'col', 'g-2');

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
        const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightTag][this.weightType];
        const enableBlocks = lbwWeightSetting.enable_blocks;
        return this.weightData.lbw.filter((_, i) => enableBlocks[i] === 1).map(v => v / 100);
    }

    #copyWeight(srcWeight, destWeight) {
        Object.keys(srcWeight).map(key => {
            destWeight[key] = [];
            for (const idx in srcWeight[key]) {
                const fVal = srcWeight[key][idx];
                destWeight[key][idx] = fVal;
            }
        });
        destWeight.VERSION = VERSION;
        destWeight.DATE = this.currentDate;
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

    #makeSliderComponent(sliderContainer, lbwPresetSelect, group, i) {
        if (this.WEIGHT_SETTINGS[group].default === undefined) {
            const unetVal = this.weightData[group][i];
            const useForceCheck = document.createElement('input');
            useForceCheck.type = "checkbox";
            if (unetVal != null) {
                useForceCheck.checked = true;
            } else {
                this.weightData[group][i] = 0;
            }
            this.weightUIs[group].active_checkbox = useForceCheck;
            sliderContainer.appendChild(useForceCheck);
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
                lbwValues = this.#lbwWeightData().join(",");
                if (lbwValues in this.lbwPresetsValueKeyMap[this.weightTag][this.weightType]) {
                    lbwPresetSelect.value = lbwValues;
                } else {
                    lbwPresetSelect.selectedIndex = 0;
                }
            }
            if ("active_checkbox" in this.weightUIs[group]) {
                const activeCheck = this.weightUIs[group].active_checkbox;
                if (!activeCheck.checked) {
                    activeCheck.checked = true;
                }
            }
            if (!this.usingExecCommand) {
                if (!lbwValues) {
                    lbwValues = this.#lbwWeightData().join(",");
                }
                const updatedText = this.#getUpdatedText(lbwValues);
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
    }

    #getUpdatedText(lbwValues) {
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
                } else if ("active_checkbox" in this.weightUIs[keyType]) {
                    if (this.weightUIs[keyType].active_checkbox.checked) {
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
        if (!lbwWeights.every(val => val === this.WEIGHT_SETTINGS.lbw.default)) {
            let rateValues = lbwWeights.map(v => v / 100).join(",");
            if (lbwValues in this.lbwPresetsValueKeyMap[this.weightTag][this.weightType]) {
                rateValues = this.lbwPresetsValueKeyMap[this.weightTag][this.weightType][lbwValues];
            }
            updatedText += `:lbw=${rateValues}`;
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
        this.textarea.focus();
        this.textarea.setSelectionRange(this.lastSelectionStart, this.lastSelectionEnd);
        document.execCommand("insertText", false, updatedText);
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
        if (!this.customContextMenu) {
            return;
        }
        if (e && e.target.id === `${this.tabId}_token_button`) {
            return;
        }
        if (e && this.customContextMenu.contains(e.target)) {
            return;
        }
        if (this.customContextMenu.parentNode === document.body &&
                (!e || e.target.id != "weight-helper-show-extra-opt-button")) {
            WeightHelper.last_instance = undefined;
            if (e != null && e.target.id.indexOf("_interrupt") > 0) {
                document.body.removeChild(this.customContextMenu);
                window.removeEventListener("click", this.close);
                return;
            }

            if (!this.weightType) {
                delete weight_helper_type[this.nameHash];
            } else {
                weight_helper_type[this.nameHash] = this.weightType;
            }
            localStorage.setItem("weight_helper_type", JSON.stringify(weight_helper_type));

            const updatedText = this.#getUpdatedText(this.#lbwWeightData().join(","));
            if (!this.usingExecCommand) {
                this.textarea.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true
                }));
                if (this.cleared || this.lastText != updatedText) {
                    this.weightData.VERSION = VERSION;
                    this.weightData.DATE = this.currentDate;
                    WeightHelper.weight_helper_history[this.nameHash].push(this.weightData);
                    localStorage.setItem("weight_helper", JSON.stringify(WeightHelper.weight_helper_history));
                }
            } else {
                if (this.cleared || this.lastText != updatedText) {
                    let tacActiveInOrg = undefined;
                    if (typeof TAC_CFG !== 'undefined' && TAC_CFG) {
                        tacActiveInOrg = TAC_CFG.activeIn.global
                        TAC_CFG.activeIn.global = false;
                    }
                    this.#updateWithExecCommand(updatedText);
                    if (typeof TAC_CFG !== 'undefined' && TAC_CFG) {
                        TAC_CFG.activeIn.global = tacActiveInOrg;
                    }
                    this.weightData.VERSION = VERSION;
                    this.weightData.DATE = this.currentDate;
                    WeightHelper.weight_helper_history[this.nameHash].push(this.weightData);
                    localStorage.setItem("weight_helper", JSON.stringify(WeightHelper.weight_helper_history));
                }
            }
            document.body.removeChild(this.customContextMenu);
            window.removeEventListener("click", this.close);
        }
    };
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
        await postAPI("/whapi/v1/init", null);
        init(await getTab(tabId), tabId);
    })();
});

function init(_, tabId) {
    let textColor = getComputedStyle(document.documentElement).getPropertyValue('--body-text-color').trim();
    let textColorRgb = textColor.slice(1).match(/.{1,2}/g).map(hex => parseInt(hex, 16));
    let textColorRgba = [...textColorRgb, 0.2];
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
