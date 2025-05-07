import { Fragment, h } from 'preact';

import * as configManager from '@/shared/manager/config-manager';
import { WeightControllerTypes } from '@/shared/types/lora-types';
import { disabled } from '@/shared/utils/helper-utils';

import * as context from '@/components/contexts/weight-helper-context';

/**
 * WeightController component provides UI controls for adjusting weight values.
 * Displays a label, optional checkbox, slider, and number input for a weight parameter.
 * @param label - The identifier for the weight block.
 * @param values - The record of all weight values.
 * @returns The WeightController component.
 */
export const WeightController = ({ label, values }: { label: string; values: Record<string, context.WeightControlState> }): h.JSX.Element => {
    const { state, dispatch } = context.useWeightHelper();
    const config = configManager.getWeightControllerConfig(label) ?? configManager.getWeightControllerConfig(WeightControllerTypes.LBW);

    /**
     * Handles the change event for the weight checkbox.
     * Updates the check state for the weight block.
     * @param e - The input change event.
     */
    const handleChangeWeightCheck = (e: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = e.target as HTMLInputElement;
        dispatch({
            type: 'SET_WEIGHT',
            payload: {
                block: label,
                value: state.weightState.weights[label].value,
                checkState: target.checked,
            },
        });
    };

    /**
     * Handles the change event for the weight slider.
     * Updates the value and check state for the weight block.
     * @param e - The input change event.
     */
    const handleChangeWeightSlider = (e: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = e.target as HTMLInputElement;
        const value = +target.value / 100;
        let checkState = state.weightState.weights[label].checkState;
        if (checkState !== undefined) {
            checkState = true;
        }
        dispatch({
            type: 'SET_WEIGHT',
            payload: {
                block: label,
                value: value,
                checkState: checkState,
            },
        });
    };

    /**
     * Handles the change event for the weight number input.
     * Updates the value and check state for the weight block.
     * @param e - The input change event.
     */
    const handleChangeWeightNumber = (e: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = e.target as HTMLInputElement;
        const value = +target.value;
        let checkState = state.weightState.weights[label].checkState;
        if (checkState !== undefined) {
            checkState = true;
        }
        dispatch({
            type: 'SET_WEIGHT',
            payload: {
                block: label,
                value: value,
                checkState: checkState,
            },
        });
    };

    const weightController = values[label];
    return (
        <Fragment key={label}>
            <span>
                <label>{label}</label>
                {state.weightState.weights[label].checkState !== undefined && (
                    <input type="checkbox" checked={state.weightState.weights[label].checkState} onChange={handleChangeWeightCheck} />
                )}
            </span>
            <div className="f f-c g-4">
                <input
                    className="slider"
                    type="range"
                    value={Math.round(weightController.value * 100)}
                    min={Math.round(weightController.sliderMin * 100)}
                    max={Math.round(weightController.sliderMax * 100)}
                    step={Math.round(config.step * 100)}
                    disabled={disabled(state, label)}
                    onChange={handleChangeWeightSlider}
                />
                <input
                    className="value"
                    type="number"
                    value={+weightController.value}
                    step={config.step}
                    disabled={disabled(state, label)}
                    onChange={handleChangeWeightNumber}
                />
            </div>
        </Fragment>
    );
};
