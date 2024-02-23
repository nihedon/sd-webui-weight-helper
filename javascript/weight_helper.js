'use strict';

const weight_helper_history = {};

var close_contextMenu;

class WeightContextMenu {

    static SUPPORT_TYPE = new Set(["lora", "lyco"]);

    WEIGHT_SETTINGS = {
        te: {
            label: "TEnc",
            min: opts.weight_helper_te_min * 100, max: opts.weight_helper_te_max * 100, default: 100, step: opts.weight_helper_te_step * 100
        },
        unet: {
            label: "UNet",
            min: opts.weight_helper_unet_min * 100, max: opts.weight_helper_unet_max * 100, default: 0, step: opts.weight_helper_unet_step * 100
        },
        dyn: {
            label: "Dyn",
            min: opts.weight_helper_dyn_min * 100, max: opts.weight_helper_dyn_max * 100, default: 0, step: opts.weight_helper_dyn_step * 100
        },
        start: {
            label: "Start",
            min: 0, max: undefined, default: 0, step: 100
        },
        stop: {
            label: "Stop",
            min: 0, max: undefined, default: undefined, step: 100
        }
    };
    BLOCK_WEIGHT_SLIDER_SETTINGS = {
        min: opts.weight_helper_lbw_min * 100,
        max: opts.weight_helper_lbw_max * 100,
        default: 100,
        step: opts.weight_helper_lbw_step * 100,
        labels: ["BASE", "IN00", "IN01", "IN02", "IN03", "IN04", "IN05", "IN06", "IN07", "IN08", "IN09", "IN10", "IN11", "MID", "OUT00", "OUT01", "OUT02", "OUT03", "OUT04", "OUT05", "OUT06", "OUT07", "OUT08", "OUT09", "OUT10", "OUT11"]
    };
    LBW_WEIGHT_SETTINGS = {
        lora: {
            type: "lora",
            name: "LoRA",
            enable_blocks: [1,0,1,1,0,1,1,0,1,1,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,1],
            block_points: [0, 1, 4, 7, 8, 12]
        },
        lyco: {
            type: "lyco",
            name: "LyCORIS",
            enable_blocks: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            block_points: [0, 1, 7, 13, 14, 20]
        },
        lora_sdxl: {
            type: "lora",
            name: "LoRA(SDXL)",
            enable_blocks: [1,0,0,0,0,1,1,0,1,1,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
            block_points: [0, 1, 5, 6]
        },
        lyco_sdxl: {
            type: "lyco",
            name: "LyCORIS(SDXL)",
            enable_blocks: [1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
            block_points: [0, 1, 5, 10, 11, 15]
        }
    };

    offsetX = 0;
    offsetY = 0;
    isDragging = false;

    lbwPresetsMap = {};
    lbwPresetsValueKeyMap = {};

    type = undefined;
    weightType = undefined;
    name = undefined;
    weightData = {};

    lastSelectionStart = undefined;
    lastSelectionEnd = undefined;
    lastText = undefined;

    historyIndex = 0;

    customContextMenu = undefined;

    lbwPresetSelect = undefined;
    lbwGroupWrapper = undefined;
    lbwUnits = {};

    usingExecCommand = false;

    constructor(tabId, textarea, selectionStart, selectionEnd, type, name, allWeights) {
        this.tabId = tabId;
        this.textarea = textarea;
        this.lastSelectionStart = selectionStart;
        this.lastSelectionEnd = selectionEnd;
        this.lastText = this.textarea.value.substring(this.lastSelectionStart, this.lastSelectionEnd);

        this.type = type;
        this.name = name;

        for (let weightKey of Object.keys(this.LBW_WEIGHT_SETTINGS)) {
            try {
                const optBlockPoints = opts["weight_helper_lbw_" + weightKey + "_block_points"]
                const blockPoints = optBlockPoints.split(',').map((v) => parseInt(v.trim()));
                this.LBW_WEIGHT_SETTINGS[weightKey].block_points = blockPoints;
            } catch (e) {
                console.warn(`${weightKey} block definition format is invalid.`, e);
            }
        }

        this.#init(allWeights);

        if (!(name in weight_helper_history)) {
            const history = {};
            WeightContextMenu.#copyWeight(this.weightData, history);

            weight_helper_history[name] = [];
            weight_helper_history[name].push(history);
        }
        this.historyIndex = weight_helper_history[name].length - 1;

        this.#initContextMenuHeader();
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

    #init(allWeights) {
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
            for (const weightType of Object.keys(this.LBW_WEIGHT_SETTINGS)) {
                this.lbwPresetsMap[weightType] = {};
                this.lbwPresetsValueKeyMap[weightType] = {};
                const enableBlocks = this.LBW_WEIGHT_SETTINGS[weightType].enable_blocks;
                const blockLength = enableBlocks.filter((b) => b == 1).length;
                for (const line of lbwPresets) {
                    const kv = line.split(":");
                    if (kv.length == 2 && kv[1].split(",").length == blockLength) {
                        this.lbwPresetsMap[weightType][kv[0]] = kv[1];
                        this.lbwPresetsValueKeyMap[weightType][kv[1]] = kv[0];
                    }
                }
            }
        }

        for (const weightType of Object.keys(this.WEIGHT_SETTINGS)) {
            this.weightData[weightType] = []
            this.weightData[weightType].push(this.WEIGHT_SETTINGS[weightType].default);
        }
        this.weightData["lbw"] = [];

        this.weightType = this.type;
        const keyTypes = ["te", "unet", "dyn", "start", "stop"];
        const weightBlocksArray = allWeights.split(":");
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
            if (keyType == "lbw") {
                blocks = weightKeyVal[1].split(',');
                for (const weightType of Object.keys(this.LBW_WEIGHT_SETTINGS)) {
                    const lbwPresets = this.lbwPresetsMap[weightType];
                    if (blocks in lbwPresets) {
                        blocks = lbwPresets[blocks].split(',');
                        break;
                    }
                }
                for (const weightType of Object.keys(this.LBW_WEIGHT_SETTINGS)) {
                    const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[weightType];
                    const enableBlocks = lbwWeightSetting.enable_blocks;
                    if (blocks.length == enableBlocks.filter((b) => b == 1).length) {
                        this.weightType = weightType;
                        this.type = lbwWeightSetting.type;
                        let refIdx = 0;
                        for (let enable of enableBlocks) {
                            if (enable) {
                                this.weightData["lbw"].push(blocks[refIdx] * 100);
                                refIdx++;
                            } else {
                                this.weightData["lbw"].push(0);
                            }
                        }
                        break;
                    }
                }
            } else if (keyType == "step") {
                const startStop = blocks.split('-');
                this.weightData["start"][0] = parseInt(startStop[0]) * 100;
                this.weightData["stop"][0] = parseInt(startStop[1]) * 100;
            } else {
                this.weightData[keyType][0] = blocks * 100;
            }
        }
        if (!this.weightData["lbw"].length) {
            const enableBlocks = this.LBW_WEIGHT_SETTINGS[this.weightType].enable_blocks;
            for (let enable of enableBlocks) {
                this.weightData["lbw"].push(enable ? 100 : 0);
            }
        }
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

        const headerLabel = document.createElement('label');
        headerLabel.textContent = "Weight Helper";
        header.appendChild(headerLabel);

        const pageWrapper = document.createElement('div');
        pageWrapper.classList.add("page");
        header.appendChild(pageWrapper);

        const pageLeft = document.createElement('span');
        pageLeft.textContent = "<";
        pageLeft.classList.add("icon");
        pageWrapper.appendChild(pageLeft);
        pageLeft.addEventListener("click", () => {
            if (this.historyIndex == 0) {
                return;
            }
            this.historyIndex--;
            pageLabel.textContent = (this.historyIndex + 1) + "/" + weight_helper_history[this.name].length;
            WeightContextMenu.#copyWeight(weight_helper_history[this.name][this.historyIndex], this.weightData);
            Object.keys(this.weightData).map(key => {
                for (const idx in this.weightData[key]) {
                    const fVal = this.weightData[key][idx];
                    if (key in this.lbwUnits) {
                        this.lbwUnits[key].slider[idx].value = fVal;
                        this.lbwUnits[key].updown[idx].value = fVal / 100;
                    }
                }
            });
            if (!this.usingExecCommand) {
                const lbwValues = this.weightData["lbw"].map(v => v / 100).join(",");
                const updatedText = this.#getUpdatedText(lbwValues);
                this.#update(updatedText);
            }
        });

        const pageLabel = document.createElement('label');
        pageLabel.textContent = (this.historyIndex + 1) + "/" + weight_helper_history[this.name].length;
        pageWrapper.appendChild(pageLabel);

        const pageRight = document.createElement('span');
        pageRight.textContent = ">";
        pageRight.classList.add("icon");
        pageWrapper.appendChild(pageRight);
        pageRight.addEventListener("click", () => {
            if (this.historyIndex == weight_helper_history[this.name].length - 1) {
                return;
            }
            this.historyIndex++;
            pageLabel.textContent = (this.historyIndex + 1) + "/" + weight_helper_history[this.name].length;
            WeightContextMenu.#copyWeight(weight_helper_history[this.name][this.historyIndex], this.weightData);
            Object.keys(this.weightData).map(key => {
                for (const idx in this.weightData[key]) {
                    const fVal = this.weightData[key][idx];
                    if (key in this.lbwUnits) {
                        this.lbwUnits[key].slider[idx].value = fVal;
                        this.lbwUnits[key].updown[idx].value = fVal / 100;
                    }
                }
            });
            if (!this.usingExecCommand) {
                const lbwValues = this.weightData["lbw"].map(v => v / 100).join(",");
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
        for (const weightType of Object.keys(this.WEIGHT_SETTINGS)) {

            const dispSliderKey = `weight_helper_disp_${weightType}_slider`;
            if (dispSliderKey in opts) {
                if (!opts[dispSliderKey]) {
                    continue;
                }
            }

            const weightSetting = this.WEIGHT_SETTINGS[weightType];

            this.lbwUnits[weightType] = {slider: [], updown: []};

            const section = document.createElement('section');
            section.classList.add("border");

            const label = document.createElement('label');
            label.textContent = weightSetting.label;
            section.appendChild(label);

            const sliderContainer = document.createElement('div');
            sliderContainer.classList.add('f', 'f-c', 'g-4');
            this.#makeSliderComponent(sliderContainer, null, weightType, 0, weightSetting.min, weightSetting.max, weightSetting.step);
            section.appendChild(sliderContainer);

            this.customContextMenu.appendChild(section);
        }

        const weightType = "lbw";

        this.lbwUnits[weightType] = {slider: [], updown: [], dom: []};

        const lbwSection = document.createElement('section');
        lbwSection.classList.add("border");

        const label = document.createElement('label');
        label.textContent = weightType;
        lbwSection.appendChild(label);

        const lbwSet = document.createElement('div');
        lbwSet.classList.add('f', 'col', 'g-4', 'w-fill');
        lbwSection.appendChild(lbwSet);

        const lbwTypeSelect = document.createElement("select");
        for (const weightType of Object.keys(this.LBW_WEIGHT_SETTINGS)) {
            const lbwTypeOpt = document.createElement('option');
            lbwTypeOpt.value = weightType;
            lbwTypeOpt.text = this.LBW_WEIGHT_SETTINGS[weightType].name;
            lbwTypeSelect.appendChild(lbwTypeOpt);
        }
        lbwTypeSelect.value = this.type;
        lbwSet.appendChild(lbwTypeSelect);

        lbwTypeSelect.addEventListener("change", (e) => {
            this.type = this.LBW_WEIGHT_SETTINGS[e.target.value].type;
            this.weightType = e.target.value;
            this.#makeLbwGroupWrapper();
        });

        this.lbwPresetSelect = document.createElement('select');
        lbwSet.appendChild(this.lbwPresetSelect);

        this.lbwPresetSelect.addEventListener("change", (e) => {
            if (e.target.value == "") {
                return;
            }

            const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightType];
            const enableBlocks = lbwWeightSetting.enable_blocks;
            const values = e.target.value.split(",").map(v => Math.round(parseFloat(v) * 100));
            let refIdx = 0;
            for (let i = 0; i < enableBlocks.length; i++) {
                let val = 0;
                if (enableBlocks[i] == 1) {
                    val = values[refIdx];
                    refIdx++;
                }
                this.weightData[weightType][i] = val;
                this.lbwUnits[weightType].slider[i].value = val;
                this.lbwUnits[weightType].updown[i].value = val / 100;
            }

            if (!this.usingExecCommand) {
                const lbwValues = this.weightData[weightType].map(v => v / 100).join(",");
                const updatedText = this.#getUpdatedText(lbwValues);
                this.#update(updatedText);
            }
        });

        for (let i = 0; i < this.weightData[weightType].length; i++) {
            let lbwUnit = document.createElement('div');
            lbwUnit.classList.add('lbw-unit', `lbw-u-${i}`);
            lbwUnit.classList.add('f', 'g-2');

            const label = document.createElement('label');
            label.textContent = this.BLOCK_WEIGHT_SLIDER_SETTINGS.labels[i];
            lbwUnit.appendChild(label);

            const sliderContainer = document.createElement('div');
            sliderContainer.classList.add('f', 'f-c', 'g-4');
            this.#makeSliderComponent(sliderContainer, this.lbwPresetSelect, weightType, i, this.BLOCK_WEIGHT_SLIDER_SETTINGS.min, this.BLOCK_WEIGHT_SLIDER_SETTINGS.max, this.BLOCK_WEIGHT_SLIDER_SETTINGS.step);
            lbwUnit.appendChild(sliderContainer);

            this.lbwUnits.lbw.dom.push(lbwUnit);
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

        if (Object.keys(this.lbwPresetsMap[this.weightType]).length) {
            for (const key of Object.keys(this.lbwPresetsMap[this.weightType])) {
                const opt = document.createElement('option');
                opt.value = this.lbwPresetsMap[this.weightType][key];
                opt.text = key;
                this.lbwPresetSelect.appendChild(opt);
            }
        }

        while (this.lbwGroupWrapper.firstChild) {
            this.lbwGroupWrapper.removeChild(this.lbwGroupWrapper.firstChild);
        }

        const weightSetting = this.LBW_WEIGHT_SETTINGS[this.weightType];

        let refIdx = 0;
        let lbwGroup = null;
        for (let i = 0; i < this.weightData["lbw"].length; i++) {
            if (weightSetting.enable_blocks[i] == 1) {
                if (weightSetting.block_points.includes(refIdx)) {
                    lbwGroup = document.createElement('div');
                    lbwGroup.classList.add('border', 'f', 'g-2', 'col');
                    this.lbwGroupWrapper.appendChild(lbwGroup);
                }
                lbwGroup.appendChild(this.lbwUnits["lbw"].dom[i]);
                refIdx++;
            }
        }
    }

    static #copyWeight(srcWeight, destWeight) {
        Object.keys(srcWeight).map(key => {
            destWeight[key] = [];
            for (const idx in srcWeight[key]) {
                const fVal = srcWeight[key][idx];
                destWeight[key][idx] = fVal;
            }
        });
    }

    static #makeSlider(value, min, max, step) {
        const slider = document.createElement('input');
        slider.classList.add('slider');
        slider.type = 'range';
        slider.min = value < min ? value : min;
        slider.max = value > max ? value : max;
        slider.step = step;
        slider.value = value;
        return slider;
    }

    static #makeUpdown(value, step) {
        const valueText = document.createElement('input');
        valueText.classList.add('value');
        valueText.type = "number";
        valueText.step = parseFloat(step) / 100;
        valueText.value = value / 100;
        return valueText;
    }

    #makeSliderComponent(sliderContainer, lbwPresetSelect, weightType, i, min, max, step) {
        const slider = WeightContextMenu.#makeSlider(Math.round(this.weightData[weightType][i]), min, max, step);
        this.lbwUnits[weightType].slider.push(slider);

        const updown = WeightContextMenu.#makeUpdown(this.weightData[weightType][i], step);
        this.lbwUnits[weightType].updown.push(updown);

        slider.addEventListener('input', (e) => {
            const fVal = parseFloat(e.target.value);
            this.weightData[weightType][i] = fVal;
            updown.value = Math.round(fVal) / 100;

            if (lbwPresetSelect && weightType == "lbw") {
                const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightType];
                const enableBlocks = lbwWeightSetting.enable_blocks;
                const lbwValues = this.weightData["lbw"]
                        .filter((_, i) => enableBlocks[i] == 1)
                        .map(v => v / 100).join(",");
                if (lbwValues in this.lbwPresetsValueKeyMap[this.weightType]) {
                    lbwPresetSelect.value = lbwValues;
                } else {
                    lbwPresetSelect.selectedIndex = 0;
                }
            }
            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText(lbwValues);
                this.#update(updatedText);
            }
        });
        updown.addEventListener('input', (e) => {
            const fVal = parseFloat(e.target.value);
            this.weightData[weightType][i] = fVal * 100;
            slider.value = Math.round(fVal * 100);

            if (lbwPresetSelect && weightType == "lbw") {
                const lbwWeightSetting = this.LBW_WEIGHT_SETTINGS[this.weightType];
                const enableBlocks = lbwWeightSetting.enable_blocks;
                const lbwValues = this.weightData["lbw"]
                        .filter((_, i) => enableBlocks[i] == 1)
                        .map(v => v / 100).join(",");
                if (lbwValues in this.lbwPresetsValueKeyMap[this.weightType]) {
                    lbwPresetSelect.value = lbwValues;
                } else {
                    lbwPresetSelect.selectedIndex = 0;
                }
            }
            if (!this.usingExecCommand) {
                const updatedText = this.#getUpdatedText(lbwValues);
                this.#update(updatedText);
            }
        });

        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(updown);
    }

    #getUpdatedText(lbwValues) {
        const defaultMap = {};
        for (const keyType of Object.keys(this.WEIGHT_SETTINGS)) {
            defaultMap[keyType] = false;
            if (keyType in this.weightData) {
                const values = this.weightData[keyType];
                if (values == this.WEIGHT_SETTINGS[keyType].default) {
                    defaultMap[keyType] = true;
                }
            }
        }
        defaultMap["lbw"] = false;
        let lbwWeights = [];
        const enableBlocks = this.LBW_WEIGHT_SETTINGS[this.weightType].enable_blocks;
        for (let idx = 0; idx < enableBlocks.length; idx++) {
            if (enableBlocks[idx]) {
                lbwWeights.push(this.weightData["lbw"][idx]);
            }
        }
        if (lbwWeights.every(val => val == this.BLOCK_WEIGHT_SLIDER_SETTINGS.default)) {
            defaultMap["lbw"] = true;
        }

        let updatedText = `<${this.type}:${this.name}`;
        for (const keyType of Object.keys(this.WEIGHT_SETTINGS)) {
            if (keyType in this.weightData) {
                if (keyType != "te") {
                    if (!defaultMap[keyType]) {
                        let rateValue = this.weightData[keyType] / 100;
                        updatedText += `:${keyType}=${rateValue}`;
                    }
                } else {
                    const rateValue = this.weightData[keyType] / 100;
                    updatedText += `:${rateValue}`;
                }
            }
        }
        if (!defaultMap["lbw"] || (!defaultMap["unet"] || !defaultMap["dyn"])) {
            let rateValues = lbwWeights.map(v => v / 100).join(",");
            if (lbwValues in this.lbwPresetsValueKeyMap) {
                rateValues = this.lbwPresetsValueKeyMap[lbwValues];
            }
            updatedText += `:lbw=${rateValues}`;
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
        close_contextMenu = this.close;
    }

    close = (e) => {
        close_contextMenu = undefined;
        if (!this.customContextMenu) {
            return;
        }
        if (e && e.target.id == `${this.tabId}_token_button`) {
            return;
        }
        if (e && this.customContextMenu.contains(e.target)) {
            return;
        }
        if (this.customContextMenu.parentNode == document.body) {
            if (e != null && e.target.id.indexOf("_interrupt") > 0) {
                document.body.removeChild(this.customContextMenu);
                window.removeEventListener("click", this.close);
                return;
            }
            const updatedText = this.#getUpdatedText(this.weightData["lbw"].map(v => v / 100).join(","));
            if (!this.usingExecCommand) {
                this.textarea.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true
                }));
                if (this.lastText != updatedText) {
                    weight_helper_history[this.name].push(this.weightData);
                }
            } else {
                if (this.lastText != updatedText) {
                    let tacActiveInOrg = undefined;
                    if (typeof TAC_CFG !== 'undefined' && TAC_CFG) {
                        tacActiveInOrg = TAC_CFG.activeIn.global
                        TAC_CFG.activeIn.global = false;
                    }
                    this.#updateWithExecCommand(updatedText);
                    if (typeof TAC_CFG !== 'undefined' && TAC_CFG) {
                        TAC_CFG.activeIn.global = tacActiveInOrg;
                    }
                    weight_helper_history[this.name].push(this.weightData);
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
        init(await getTab(tabId), tabId);
    })();
});

const REGEX = /<([^:]+):([^:]+):([^>]+)>/;

var lastWeightInfo = undefined;

function init(_, tabId) {
    const textareas = document.querySelectorAll("*:is([id*='_toprow'] [id*='_prompt'], .prompt) textarea")
    const lbwPreset = gradioApp().getElementById("lbw_ratiospreset");
    textareas.forEach((textarea) => {
        textarea.addEventListener('contextmenu', function(e) {
            if (!lbwPreset) {
                return;
            }
            if (!opts.weight_helper_enabled) {
                return;
            }
            if (close_contextMenu) {
                e.preventDefault();
                close_contextMenu();
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
                const type = match[1].toLowerCase();
                const name = match[2];
                const weights = match[3];

                if (WeightContextMenu.SUPPORT_TYPE.has(type)) {
                    e.preventDefault();

                    if (lastWeightInfo) {
                        lastWeightInfo.close(null);
                    }

                    const selectionStart = tmpSelectionStart + match.index;
                    const selectionEnd = selectionStart + match.input.trim().length;
                    lastWeightInfo = new WeightContextMenu(tabId, e.target, selectionStart, selectionEnd, type, name, weights);
                    lastWeightInfo.show(e.pageY + 15, e.pageX);
                }
            }
        });
    })
}
