import { Fragment, h } from 'preact';

import { SELECTABLE_LORA_BLOCK_TYPES, SELECTABLE_MODEL_TYPES } from '@/shared/constants/common-const';
import * as configManager from '@/shared/manager/config-manager';
import * as currentState from '@/shared/state/current-state';
import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';
import { disabled } from '@/shared/utils/helper-utils';
import { mergeWeightsWithGroups } from '@/shared/utils/weight-utils';

import * as context from '@/components/contexts/weight-helper-context';

/**
 * LoraSettingsSection component provides controls for model settings.
 * Allows selection of model type, LoRA block type, presets, and XYZ mode.
 * @returns The LoraSettingsSection component.
 */
export const LoraSettingsSection = () => {
    const { state, dispatch } = context.useWeightHelper();

    /**
     * Handles the change event for the LoRA block type select box.
     * Updates the block groups, presets, and weights for the selected block type.
     * @param e - The select change event.
     */
    const handleChangeLoraBlockType = (e: h.JSX.TargetedEvent<HTMLSelectElement, Event>) => {
        const target = e.target as HTMLSelectElement;
        const selectedLoraBlockType = target.value as LoraBlockTypes;

        const blockGroups = configManager.getLbwBlockGroups(state.weightState.selectedModelType, selectedLoraBlockType);
        const lbwPresets = currentState.getLbwPresets(state.weightState.selectedModelType, selectedLoraBlockType);
        const weights = mergeWeightsWithGroups(state.weightState.weights, blockGroups);

        dispatch({
            type: 'SET_MODELINFO',
            payload: {
                selectedLoraBlockType: selectedLoraBlockType,
                selectedModelType: state.weightState.selectedModelType,
                blockGroups: blockGroups,
                lbwPresets: lbwPresets,
                weights: weights,
            },
        });
    };

    /**
     * Handles the change event for the model type select box.
     * Updates the block groups, presets, and weights for the selected model type.
     * @param e - The select change event.
     */
    const handleChangeModelType = (e: h.JSX.TargetedEvent<HTMLSelectElement, Event>) => {
        const target = e.target as HTMLSelectElement;
        const selectedModelType = target.value as ModelTypes;

        const blockGroups = configManager.getLbwBlockGroups(selectedModelType, state.weightState.selectedLoraBlockType);
        const lbwPresets = currentState.getLbwPresets(selectedModelType, state.weightState.selectedLoraBlockType);
        const weights = mergeWeightsWithGroups(state.weightState.weights, blockGroups);

        dispatch({
            type: 'SET_MODELINFO',
            payload: {
                selectedModelType: selectedModelType,
                selectedLoraBlockType: state.weightState.selectedLoraBlockType,
                blockGroups: blockGroups,
                lbwPresets: lbwPresets,
                weights: weights,
            },
        });
    };

    /**
     * Handles the toggle event for the XYZ mode checkbox.
     * Dispatches an action to toggle the XYZ mode state.
     */
    const handleToggleXyzMode = () => {
        dispatch({ type: 'TOGGLE_XYZ_MODE' });
    };

    /**
     * Handles the change event for the preset select box.
     * Applies the selected preset weights to the state.
     * @param e - The select change event.
     */
    const handleApplyPresetWeights = (e: h.JSX.TargetedEvent<HTMLSelectElement, Event>) => {
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

        const weights: Record<string, context.WeightControlState> = {};
        const maskedLbwBlocks = configManager.getMaskedLbwBlocks(state.weightState.selectedModelType, state.weightState.selectedLoraBlockType);
        maskedLbwBlocks.forEach((block, i) => {
            weights[block] = {
                initValue: state.weightState.weights[block].initValue,
                value: presetValues[i],
                sliderMin: Math.min(presetValues[i], state.weightState.weights[block].sliderMin),
                sliderMax: Math.max(presetValues[i], state.weightState.weights[block].sliderMax),
            };
        });

        dispatch({
            type: 'SET_PRESET',
            payload: {
                weights: weights,
                preset: target.value,
            },
        });
    };

    return (
        <Fragment>
            <div className="f g-2 f-end">
                <select value={state.weightState.selectedModelType} style={{ flexGrow: 1 }} disabled={disabled(state)} onChange={handleChangeModelType}>
                    {Object.entries(SELECTABLE_MODEL_TYPES).map(([name, modelType]) => (
                        <option value={modelType}>{name}</option>
                    ))}
                </select>
                <select value={state.weightState.selectedLoraBlockType} style={{ flexGrow: 1 }} disabled={disabled(state)} onChange={handleChangeLoraBlockType}>
                    {Object.entries(SELECTABLE_LORA_BLOCK_TYPES).map(([name, loraBlockType]) => (
                        <option value={loraBlockType}>{name}</option>
                    ))}
                </select>
            </div>
            <div className="f g-2 f-end">
                <select value={state.preset} style={{ flexGrow: 1 }} disabled={disabled(state)} onChange={handleApplyPresetWeights}>
                    <option value=""></option>
                    {Object.keys(state.lbwPresets).map((presetName) => (
                        <option value={presetName}>{presetName}</option>
                    ))}
                </select>
                <div className="p f g-2 f-end">
                    <div className="f g-2 f-end">
                        <input
                            id="wh:xyz"
                            value="XYZ"
                            type="checkbox"
                            checked={state.weightState.xyzMode}
                            disabled={disabled(state)}
                            onChange={handleToggleXyzMode}
                        />
                        <label className="radio-label" htmlFor="wh:xyz">
                            {configManager.getXyzLabel(state.weightState.selectedModelType, state.weightState.selectedLoraBlockType)}
                        </label>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};
