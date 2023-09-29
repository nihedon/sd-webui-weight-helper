'use strict';

class WeightContextMenu {

    static SUPPORT_TYPE = new Set(["lora", "lyco"]);

    weightInfoMap = {
        te: {
            label: "TEnc",
            min: opts.weight_helper_te_min * 100, max: opts.weight_helper_te_max * 100, default: 100, step: opts.weight_helper_te_step * 100,
            lora: { count: 1, labels: {} },
            lyco: { count: 1, labels: {} }
        },
        unet: {
            label: "UNet",
            min: opts.weight_helper_unet_min * 100, max: opts.weight_helper_unet_max * 100, default: 0, step: opts.weight_helper_unet_step * 100,
            lora: { count: 1, labels: {} },
            lyco: { count: 1, labels: {} }
        },
        dyn: {
            label: "Dyn",
            min: opts.weight_helper_dyn_min * 100, max: opts.weight_helper_dyn_max * 100, default: 25600, step: opts.weight_helper_dyn_step * 100,
            lora: { count: 1, labels: {} },
            lyco: { count: 1, labels: {} }
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

    lbwPresetsMap = {}
    lbwPresetsValueKeyMap = {}

    type = undefined;
    name = undefined;
    weightBlocksMap = {}

    lastSelectionStart = undefined;
    lastSelectionEnd = undefined;

    customContextMenu = undefined;

    sliders = {}
    updowns = {}

    usingExecCommand = false;

    constructor(tabId, textarea, selectionStart, selectionEnd, type, name, weightBlocks) {
        this.tabId = tabId;
        this.textarea = textarea;
        this.lastSelectionStart = selectionStart;
        this.lastSelectionEnd = selectionEnd;

        this.type = type;
        this.name = name;

        this.#loadLbwPresets();
        this.#initWeights(weightBlocks);
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
                if (kv[1].split(",").length == this.weightInfoMap["lbw"][this.type].count) {
                    this.lbwPresetsMap[kv[0]] = kv[1];
                    this.lbwPresetsValueKeyMap[kv[1]] = kv[0];
                }
            }
        }
    }

    #initWeights(weightBlocks) {
        for (const weightKey of Object.keys(this.weightInfoMap)) {
            this.weightBlocksMap[weightKey] = []
            for (let i = 0; i < this.weightInfoMap[weightKey][this.type]["count"]; i++) {
                const def = this.weightInfoMap[weightKey].default;
                this.weightBlocksMap[weightKey].push(def);
            }
        }

        if (weightBlocks) {
            const weightTypes = ["te", "unet", "dyn"];
            const weightBlocksArray = weightBlocks.split(":");
            for (let i = 0; i < weightBlocksArray.length; i++) {
                let weightBlocks = weightBlocksArray[i].split("=");
                let weightType;
                let blocks;
                if (weightBlocks.length > 1) {
                    weightType = weightBlocks[0].toLowerCase();
                    blocks = weightBlocks[1].split(',');
                } else {
                    weightType = weightTypes[i];
                    blocks = weightBlocks[0].split(',');
                }
                if (weightType == "lbw") {
                    if (blocks[0] in this.lbwPresetsMap) {
                        blocks = this.lbwPresetsMap[blocks[0]].split(',');
                    }
                }
                for (let j = 0; j < blocks.length; j++) {
                    this.weightBlocksMap[weightType][j] = parseFloat(blocks[j]) * 100;
                }
            }
        }
    }

    #initContextMenuDom() {

        this.customContextMenu = document.createElement('div');
        this.customContextMenu.id = 'weight-helper';
        this.customContextMenu.classList.add('context-menu');

        const header = document.createElement('div');
        header.classList.add("draggable-header");

        const headerLabel = document.createElement('label');
        headerLabel.textContent = "Weight Helper";
        header.appendChild(headerLabel);

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

            const x = e.clientX - this.offsetX;
            const y = e.clientY - this.offsetY;

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

    #getUpdatedText(lbwValues) {
        const defaultMap = {}
        for (const weightType of Object.keys(this.weightInfoMap)) {
            defaultMap[weightType] = false;
            if (weightType in this.weightBlocksMap) {
                const values = this.weightBlocksMap[weightType];
                if (values.every(val => val == this.weightInfoMap[weightType].default)) {
                    defaultMap[weightType] = true;
                }
            }
        }
        let updatedText = `<${this.type}:${this.name}`;
        for (const weightType of Object.keys(this.weightInfoMap)) {
            if (weightType in this.weightBlocksMap) {
                if (weightType != "te") {
                    if (!defaultMap[weightType]
                            || weightType == "lbw" && (!defaultMap["unet"] || !defaultMap["dyn"])) {
                        let rateValues;
                        if (weightType == "lbw") {
                            rateValues = lbwValues;
                            if (lbwValues in this.lbwPresetsValueKeyMap) {
                                rateValues = this.lbwPresetsValueKeyMap[lbwValues];
                            }
                        } else {
                            rateValues = this.weightBlocksMap[weightType].map(v => v / 100).join(",")
                        }
                        updatedText += `:${weightType}=${rateValues}`;
                    }
                } else {
                    const rateValues = this.weightBlocksMap[weightType].map(v => v / 100).join(",")
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
        this.textarea.setSelectionRange(1, 4);
        this.textarea.setSelectionRange(this.lastSelectionStart, this.lastSelectionEnd);
        document.execCommand("insertText", false, updatedText);
    }

    show(top, left) {
        this.customContextMenu.style.top = top + 'px';
        this.customContextMenu.style.left = left + 'px';
        document.body.appendChild(this.customContextMenu);
        window.addEventListener('click', this.close);
    }

    close = (e) => {
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
            if (!this.usingExecCommand) {
                this.textarea.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true
                }));
            } else {
                const updatedText = this.#getUpdatedText(this.weightBlocksMap["lbw"].map(v => v / 100).join(","));
                this.#updateWithExecCommand(updatedText);
            }
            document.body.removeChild(this.customContextMenu);
            window.removeEventListener("click", this.close);
        }
    }
}

async function getTab(tabName) {
    let tab = null
    while (!tab) {
        tab = gradioApp().getElementById(`tab_${tabName}`)
        if (!tab) {
            await new Promise((resolve) => setTimeout(resolve, 200))
        }
    }
    return tab
}

document.addEventListener('DOMContentLoaded', function () {
    (async () => {
        const tabId = "txt2img";
        init(await getTab(tabId), tabId);
    })()
})

const REGEX = /<([^:]+):([^:]+):([^>]+)>/;

var lastWeightInfo = undefined;

function init(tab, tabId) {
    const textarea = tab.querySelector(`#${tabId}_prompt textarea`);
    textarea.addEventListener('contextmenu', function (e) {
        if (!opts.weight_helper_enabled) {
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
}
