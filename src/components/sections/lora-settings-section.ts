import { SELECTABLE_LORA_BLOCK_TYPES, SELECTABLE_MODEL_TYPES } from '@/shared/constants/common-const';
import * as configManager from '@/shared/manager/config-manager';
import * as currentState from '@/shared/state/current-state';
import * as globalState from '@/shared/state/global-weight-helper-state';
import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';
import { disabled } from '@/shared/utils/helper-utils';
import { mergeWeightsWithGroups } from '@/shared/utils/weight-utils';

import { TemplateResult, html } from 'lit-html';

/**
 * LoraSettingsSection creates controls for model settings.
 * Allows selection of model type, LoRA block type, presets, and XYZ mode.
 * @returns The LoraSettingsSection template.
 */
export function createLoraSettingsSection(): TemplateResult {
    const state = globalState.getGlobalState();

    /**
     * Handles the change event for the LoRA block type select box.
     * Updates the block groups, presets, and weights for the selected block type.
     * @param e - The select change event.
     */
    const handleChangeLoraBlockType = (e: Event) => {
        const target = e.target as HTMLSelectElement;
        const selectedLoraBlockType = target.value as LoraBlockTypes;

        const blockGroups = configManager.getLbwBlockGroups(state.weightState.selectedModelType, selectedLoraBlockType);
        const lbwPresets = currentState.getLbwPresets(state.weightState.selectedModelType, selectedLoraBlockType);
        const weights = mergeWeightsWithGroups(state.weightState.weights, blockGroups);

        globalState.setModelInfo({
            selectedLoraBlockType: selectedLoraBlockType,
            selectedModelType: state.weightState.selectedModelType,
            blockGroups: blockGroups,
            lbwPresets: lbwPresets,
            weights: weights,
        });
    };

    /**
     * Handles the change event for the model type select box.
     * Updates the block groups, presets, and weights for the selected model type.
     * @param e - The select change event.
     */
    const handleChangeModelType = (e: Event) => {
        const target = e.target as HTMLSelectElement;
        const selectedModelType = target.value as ModelTypes;

        const blockGroups = configManager.getLbwBlockGroups(selectedModelType, state.weightState.selectedLoraBlockType);
        const lbwPresets = currentState.getLbwPresets(selectedModelType, state.weightState.selectedLoraBlockType);
        const weights = mergeWeightsWithGroups(state.weightState.weights, blockGroups);

        globalState.setModelInfo({
            selectedModelType: selectedModelType,
            selectedLoraBlockType: state.weightState.selectedLoraBlockType,
            blockGroups: blockGroups,
            lbwPresets: lbwPresets,
            weights: weights,
        });
    };

    /**
     * Handles the toggle event for the XYZ mode checkbox.
     * Dispatches an action to toggle the XYZ mode state.
     */
    const handleToggleXyzMode = () => {
        globalState.toggleXyzMode();
    };

    /**
     * Handles the change event for the preset select box.
     * Applies the selected preset weights to the state.
     * @param e - The select change event.
     */
    const handleApplyPresetWeights = (e: Event) => {
        const target = e.target as HTMLSelectElement;
        let preset = target.value as string;
        if (preset === '') {
            preset = state.preset;
            if (preset === '') {
                return;
            }
        }
        const presetValues = currentState
            .getLbwPresets(state.weightState.selectedModelType, state.weightState.selectedLoraBlockType)
            [preset].split(',')
            .map((v) => +v);

        const weights: Record<string, globalState.WeightControlState> = {};
        const maskedLbwBlocks = configManager.getMaskedLbwBlocks(state.weightState.selectedModelType, state.weightState.selectedLoraBlockType);
        maskedLbwBlocks.forEach((block, i) => {
            weights[block] = {
                initValue: state.weightState.weights[block].initValue,
                value: presetValues[i],
                sliderMin: Math.min(presetValues[i], state.weightState.weights[block].sliderMin),
                sliderMax: Math.max(presetValues[i], state.weightState.weights[block].sliderMax),
            };
        });

        globalState.setPreset({
            weights: weights,
            preset: target.value,
        });
    };

    return html`
        <div class="f g-2 f-end">
            <select .value="${state.weightState.selectedModelType}" style="flex-grow: 1" ?disabled="${disabled(state)}" @change="${handleChangeModelType}">
                ${Object.entries(SELECTABLE_MODEL_TYPES).map(([name, modelType]) => html` <option value="${modelType}">${name}</option> `)}
            </select>
            <select
                .value="${state.weightState.selectedLoraBlockType}"
                style="flex-grow: 1"
                ?disabled="${disabled(state)}"
                @change="${handleChangeLoraBlockType}"
            >
                ${Object.entries(SELECTABLE_LORA_BLOCK_TYPES).map(([name, loraBlockType]) => html` <option value="${loraBlockType}">${name}</option> `)}
            </select>
        </div>
        <div class="f g-2 f-end">
            <select .value="${state.preset}" style="flex-grow: 1" ?disabled="${disabled(state)}" @change="${handleApplyPresetWeights}">
                <option value=""></option>
                ${Object.keys(state.lbwPresets).map((presetName) => html` <option value="${presetName}">${presetName}</option> `)}
            </select>
            <div class="p f g-2 f-end">
                <div class="f g-2 f-end">
                    <input
                        id="wh:xyz"
                        value="XYZ"
                        type="checkbox"
                        .checked="${state.weightState.xyzMode}"
                        ?disabled="${disabled(state)}"
                        @change="${handleToggleXyzMode}"
                    />
                    <label class="radio-label" for="wh:xyz">
                        ${configManager.getXyzLabel(state.weightState.selectedModelType, state.weightState.selectedLoraBlockType)}
                    </label>
                </div>
            </div>
        </div>
    `;
}
