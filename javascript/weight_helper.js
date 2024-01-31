'use strict';

const weight_helper_history = {};

var close_contextMenu;

class WeightContextMenu {

    static SUPPORT_TYPE = new Set(["lora", "lyco"]);

    weightInfoMap = {
        te: {
            label: "TEnc",
            min: opts.weight_helper_te_min * 100, max: opts.weight_helper_te_max * 100, default: 100, step: opts.weight_helper_te_step * 100,
            lora: {count: 1, labels: {}},
            lyco: {count: 1, labels: {}}
        },
        unet: {
            label: "UNet",
            min: opts.weight_helper_unet_min * 100, max: opts.weight_helper_unet_max * 100, default: 0, step: opts.weight_helper_unet_step * 100,
            lora: {count: 1, labels: {}},
            lyco: {count: 1, labels: {}}
        },
        dyn: {
            label: "Dyn",
            min: opts.weight_helper_dyn_min * 100, max: opts.weight_helper_dyn_max * 100, default: 25600, step: opts.weight_helper_dyn_step * 100,
            lora: {count: 1, labels: {}},
            lyco: {count: 1, labels: {}}
        },
        start: {
            label: "Start",
            min: 0, max: undefined, default: 0, step: 100,
            lora: {count: 1, labels: {}},
            lyco: {count: 1, labels: {}}
        },
        stop: {
            label: "Stop",
            min: 0, max: undefined, default: undefined, step: 100,
            lora: {count: 1, labels: {}},
            lyco: {count: 1, labels: {}}
        },
        lbw: {
            label: "LBW",
            min: opts.weight_helper_lbw_min * 100, max: opts.weight_helper_lbw_max * 100, default: 100, step: opts.weight_helper_lbw_step * 100,
            lora: {
                count: 17,
                labels: {
                    0: "BASE", 1: "IND", 4: "INS", 7: "MIDD", 8: "OUTD", 12: "OUTS"
                }
            },
            lyco: {
                count: 26,
                labels: {
                    0: "BASE", 1: "IN00-05", 7: "IN06-11", 13: "MID", 14: "OUT00-05", 20: "OUT06-11"
                }
            }
        }
    };

    offsetX = 0;
    offsetY = 0;
    isDragging = false;

    lbwPresetsMap = {};
    lbwPresetsValueKeyMap = {};

    type = undefined;
    name = undefined;
    weightBlocksMap = {};

    lastSelectionStart = undefined;
    lastSelectionEnd = undefined;
    lastText = undefined;

    historyIndex = 0;

    customContextMenu = undefined;

    sliders = {};
    updowns = {};

    usingExecCommand = false;

    constructor(tabId, textarea, selectionStart, selectionEnd, type, name, weightBlocks) {
        this.tabId = tabId;
        this.textarea = textarea;
        this.lastSelectionStart = selectionStart;
        this.lastSelectionEnd = selectionEnd;
        this.lastText = this.textarea.value.substring(this.lastSelectionStart, this.lastSelectionEnd);

        this.type = type;
        this.name = name;

        try {
            const loraBlocks = opts.weight_helper_lbw_lora_blocks.split(',').map(pair => pair.trim().split(/:\s*/));
            this.weightInfoMap["lbw"]["lora"]["labels"] = Object.fromEntries(loraBlocks.map(([key, value]) => [parseInt(key), value]));
        } catch (e) {
            console.warn("lora block definition format is invalid.", e);
        }
        try {
            const lycoBlocks = opts.weight_helper_lbw_lyco_blocks.split(',').map(pair => pair.trim().split(/:\s*/));
            this.weightInfoMap["lbw"]["lyco"]["labels"] = Object.fromEntries(lycoBlocks.map(([key, value]) => [parseInt(key), value]));
        } catch (e) {
            console.warn("lyco block definition format is invalid.", e);
        }
        this.#loadLbwPresets();
        this.#initWeights(weightBlocks);

        if (!(name in weight_helper_history)) {
            const history = {};
            WeightContextMenu.#copyWeight(this.weightBlocksMap, history);

            weight_helper_history[name] = [];
            weight_helper_history[name].push(history);
        }
        this.historyIndex = weight_helper_history[name].length - 1;

        this.#initContextMenuDom();

        if (opts.weight_helper_using_execCommand) {
            if (typeof document.execCommand === 'function') {
                this.usingExecCommand = true;
            } else {
                console.warn("execCommand is not supported.");
            }
        }
    }

    #loadLbwPresets() {
        const lbwPreset = gradioApp().getElementById("lbw_ratiospreset").querySelector("textarea");
        if (lbwPreset && lbwPreset.value) {
            const lbwPresets = lbwPreset.value.split("\n");
            for (const line of lbwPresets) {
                const kv = line.split(":");
                if (kv.length == 2 && kv[1].split(",").length == this.weightInfoMap["lbw"][this.type].count) {
                    this.lbwPresetsMap[kv[0]] = kv[1];
                    this.lbwPresetsValueKeyMap[kv[1]] = kv[0];
                }
            }
        }
    }

    #initWeights(weightBlocks) {
        const samplingSteps = gradioApp().getElementById("txt2img_steps").querySelector("input");
        if (samplingSteps) {
            const samplingStepsValue = parseInt(samplingSteps.value) * 100;
            this.weightInfoMap["start"]["max"] = samplingStepsValue;
            this.weightInfoMap["stop"]["max"] = samplingStepsValue;
            this.weightInfoMap["stop"]["default"] = samplingStepsValue;
        }
        for (const weightKey of Object.keys(this.weightInfoMap)) {
            this.weightBlocksMap[weightKey] = [];
            for (let i = 0; i < this.weightInfoMap[weightKey][this.type]["count"]; i++) {
                const def = this.weightInfoMap[weightKey].default;
                this.weightBlocksMap[weightKey].push(def);
            }
        }

        if (weightBlocks) {
            const keyTypes = ["te", "unet", "dyn"];
            const weightBlocksArray = weightBlocks.split(":");
            for (let i = 0; i < weightBlocksArray.length; i++) {
                let weightBlocks = weightBlocksArray[i].split("=");
                let keyType;
                let blocks;
                if (weightBlocks.length > 1) {
                    keyType = weightBlocks[0].toLowerCase();
                    blocks = weightBlocks[1].split(',');
                } else {
                    keyType = keyTypes[i];
                    blocks = weightBlocks[0].split(',');
                }
                if (keyType == "lbw") {
                    if (blocks[0] in this.lbwPresetsMap) {
                        blocks = this.lbwPresetsMap[blocks[0]].split(',');
                    }
                }
                for (let j = 0; j < blocks.length; j++) {
                    if (keyType == "step") {
                        const startStop = blocks[j].split('-');
                        this.weightBlocksMap["start"][j] = parseInt(startStop[0]) * 100;
                        this.weightBlocksMap["stop"][j] = parseInt(startStop[1]) * 100;
                    } else {
                        this.weightBlocksMap[keyType][j] = parseFloat(blocks[j]) * 100;
                    }
                }
            }
        }
    }

    #initContextMenuDom() {

        this.customContextMenu = document.createElement('div');
        this.customContextMenu.id = 'weight-helper';
        this.customContextMenu.classList.add('context-menu');

        let scale = opts.weight_helper_context_menu_scale;
        if (scale <= 0) {
            scale = 1;
        }
        this.customContextMenu.style.transform = `scale(${scale})`;

        const header = document.createElement('div');
        header.classList.add("draggable-header");

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
            WeightContextMenu.#copyWeight(weight_helper_history[this.name][this.historyIndex], this.weightBlocksMap);
            Object.keys(this.weightBlocksMap).map(key => {
                for (const idx in this.weightBlocksMap[key]) {
                    const fVal = this.weightBlocksMap[key][idx];
                    if (key in this.sliders) {
                        this.sliders[key][idx].value = fVal;
                        this.updowns[key][idx].value = fVal / 100;
                    }
                }
            });
            if (!this.usingExecCommand) {
                const lbwValues = this.weightBlocksMap["lbw"].map(v => v / 100).join(",");
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
            WeightContextMenu.#copyWeight(weight_helper_history[this.name][this.historyIndex], this.weightBlocksMap);
            Object.keys(this.weightBlocksMap).map(key => {
                for (const idx in this.weightBlocksMap[key]) {
                    const fVal = this.weightBlocksMap[key][idx];
                    if (key in this.sliders) {
                        this.sliders[key][idx].value = fVal;
                        this.updowns[key][idx].value = fVal / 100;
                    }
                }
            });
            if (!this.usingExecCommand) {
                const lbwValues = this.weightBlocksMap["lbw"].map(v => v / 100).join(",");
                const updatedText = this.#getUpdatedText(lbwValues);
                this.#update(updatedText);
            }
        });

        this.customContextMenu.appendChild(header);

        this.customContextMenu.addEventListener('mousedown', (e) => {
            if (e.target.closest('.draggable-header')) {
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

        for (const weightTypeKey of Object.keys(this.weightInfoMap)) {

            const dispSliderOptName = `weight_helper_disp_${weightTypeKey}_slider`;
            if (dispSliderOptName in opts) {
                if (!opts[dispSliderOptName]) {
                    continue;
                }
            }

            const weightInfo = this.weightInfoMap[weightTypeKey];
            const weightBlockInfo = weightInfo[this.type];

            const sliderContainerType = document.createElement('div');
            sliderContainerType.classList.add('slider-container-type');

            const label = document.createElement('label');
            label.textContent = weightInfo.label;
            sliderContainerType.appendChild(label);

            const sliderContainerGroups = document.createElement('div');
            sliderContainerGroups.classList.add('slider-container-groups');
            sliderContainerType.appendChild(sliderContainerGroups);

            let lbwPresetSelect;
            if (weightTypeKey == "lbw" && Object.keys(this.lbwPresetsMap).length) {
                lbwPresetSelect = document.createElement('select');
                const opt = document.createElement('option');
                opt.value = "";
                opt.text = "";
                lbwPresetSelect.appendChild(opt);

                for (const key of Object.keys(this.lbwPresetsMap)) {
                    const opt = document.createElement('option');
                    opt.value = this.lbwPresetsMap[key];
                    opt.text = key;
                    lbwPresetSelect.appendChild(opt);
                }

                const lbwValues = this.weightBlocksMap[weightTypeKey].map(v => v / 100).join(",");
                lbwPresetSelect.value = lbwValues;

                sliderContainerGroups.appendChild(lbwPresetSelect);
                lbwPresetSelect.addEventListener("change", (e) => {
                    if (e.target.value == "") {
                        return;
                    }
                    const values = e.target.value.split(",").map(v => Math.round(parseFloat(v) * 100));
                    for (const i in this.weightBlocksMap[weightTypeKey]) {
                        this.weightBlocksMap[weightTypeKey][i] = values[i];
                    }
                    for (const i in this.sliders[weightTypeKey]) {
                        this.sliders[weightTypeKey][i].value = values[i];
                    }
                    for (const i in this.updowns[weightTypeKey]) {
                        this.updowns[weightTypeKey][i].value = values[i] / 100;
                    }
                    if (!this.usingExecCommand) {
                        const lbwValues = this.weightBlocksMap[weightTypeKey].map(v => v / 100).join(",");
                        const updatedText = this.#getUpdatedText(lbwValues);
                        this.#update(updatedText);
                    }
                });
            }

            this.sliders[weightTypeKey] = [];
            this.updowns[weightTypeKey] = [];

            let sliderContainerGroup = undefined;
            let sliderContainerWrapper = undefined;
            for (let i = 0; i < weightBlockInfo.count; i++) {

                if (!sliderContainerGroup || i in weightBlockInfo.labels) {

                    sliderContainerGroup = document.createElement('div');
                    sliderContainerGroup.classList.add('slider-container-group');

                    if (i in weightBlockInfo.labels) {
                        sliderContainerGroup.classList.add('border');
                        const label = document.createElement('label');
                        label.textContent = weightBlockInfo.labels[i];
                        sliderContainerGroup.appendChild(label);
                    }

                    sliderContainerWrapper = document.createElement('div');
                    sliderContainerWrapper.classList.add('slider-container-wrapper');
                    sliderContainerGroup.appendChild(sliderContainerWrapper);
                }

                const slider = WeightContextMenu.#makeSlider(Math.round(this.weightBlocksMap[weightTypeKey][i]), weightInfo.min, weightInfo.max, weightInfo.step);
                const updown = WeightContextMenu.#makeUpdown(this.weightBlocksMap[weightTypeKey][i], weightInfo.step);

                this.sliders[weightTypeKey].push(slider);
                this.updowns[weightTypeKey].push(updown);

                slider.addEventListener('input', (e) => {
                    const fVal = parseFloat(e.target.value);
                    this.weightBlocksMap[weightTypeKey][i] = fVal;
                    updown.value = Math.round(fVal) / 100;

                    const lbwValues = this.weightBlocksMap["lbw"].map(v => v / 100).join(",");
                    if (weightTypeKey == "lbw" && lbwPresetSelect) {
                        if (lbwValues in this.lbwPresetsValueKeyMap) {
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
                    this.weightBlocksMap[weightTypeKey][i] = fVal * 100;
                    slider.value = Math.round(fVal * 100);

                    const lbwValues = this.weightBlocksMap["lbw"].map(v => v / 100).join(",");
                    if (weightTypeKey == "lbw" && lbwPresetSelect) {
                        if (lbwValues in this.lbwPresetsValueKeyMap) {
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

                const sliderContainer = document.createElement('div');
                sliderContainer.classList.add('slider-container');
                sliderContainer.appendChild(slider);
                sliderContainer.appendChild(updown);
                sliderContainerWrapper.appendChild(sliderContainer);

                sliderContainerGroups.appendChild(sliderContainerGroup);
            }
            this.customContextMenu.appendChild(sliderContainerType);
        }
    }

    static #makeSlider(value, min, max, step) {
        const slider = document.createElement('input');
        slider.classList.add('slider');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
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

    static #copyWeight(srcWeight, destWeight) {
        Object.keys(srcWeight).map(key => {
            destWeight[key] = [];
            for (const idx in srcWeight[key]) {
                const fVal = srcWeight[key][idx];
                destWeight[key][idx] = fVal;
            }
        });
    }

    #getUpdatedText(lbwValues) {
        const defaultMap = {};
        for (const keyType of Object.keys(this.weightInfoMap)) {
            defaultMap[keyType] = false;
            if (keyType in this.weightBlocksMap) {
                const values = this.weightBlocksMap[keyType];
                if (values.every(val => val == this.weightInfoMap[keyType].default)) {
                    defaultMap[keyType] = true;
                }
            }
        }
        let updatedText = `<${this.type}:${this.name}`;
        for (const keyType of Object.keys(this.weightInfoMap)) {
            if (keyType in this.weightBlocksMap) {
                if (keyType != "te") {
                    if (!defaultMap[keyType] ||
                            keyType == "lbw" && (!defaultMap["unet"] || !defaultMap["dyn"])) {
                        let rateValues;
                        if (keyType == "lbw") {
                            rateValues = lbwValues;
                            if (lbwValues in this.lbwPresetsValueKeyMap) {
                                rateValues = this.lbwPresetsValueKeyMap[lbwValues];
                            }
                        } else {
                            rateValues = this.weightBlocksMap[keyType].map(v => v / 100).join(",");
                        }
                        updatedText += `:${keyType}=${rateValues}`;
                    }
                } else {
                    const rateValues = this.weightBlocksMap[keyType].map(v => v / 100).join(",");
                    updatedText += `:${rateValues}`;
                }
            }
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
            const updatedText = this.#getUpdatedText(this.weightBlocksMap["lbw"].map(v => v / 100).join(","));
            if (!this.usingExecCommand) {
                this.textarea.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true
                }));
                if (this.lastText != updatedText) {
                    weight_helper_history[this.name].push(this.weightBlocksMap);
                }
            } else {
                if (this.lastText != updatedText) {
                    this.#updateWithExecCommand(updatedText);
                    weight_helper_history[this.name].push(this.weightBlocksMap);
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
