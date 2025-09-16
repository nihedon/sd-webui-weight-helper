import * as configManager from '@/shared/manager/config-manager';
import * as globalState from '@/shared/state/global-weight-helper-state';
import { WeightControllerTypes } from '@/shared/types/lora-types';
import { disabled } from '@/shared/utils/helper-utils';

import { TemplateResult, html } from 'lit-html';

/**
 * WeightController component provides UI controls for adjusting weight values.
 * Displays a label, optional checkbox, slider, and number input for a weight parameter.
 * @param label - The identifier for the weight block.
 * @param values - The record of all weight values.
 * @returns The WeightController template.
 */
export function createWeightController(label: string, values: Record<string, globalState.WeightControlState>): TemplateResult {
    const state = globalState.getGlobalState();
    const config = configManager.getWeightControllerConfig(label) ?? configManager.getWeightControllerConfig(WeightControllerTypes.LBW);

    /**
     * Handles the change event for the weight checkbox.
     * Updates the check state for the weight block.
     * @param e - The input change event.
     */
    const handleChangeWeightCheck = (e: Event) => {
        const target = e.target as HTMLInputElement;
        globalState.setWeight({
            block: label,
            value: state.weightState.weights[label].value,
            checkState: target.checked,
        });
    };

    /**
     * Handles the change event for the weight slider.
     * Updates the value and check state for the weight block.
     * @param e - The input change event.
     */
    const handleChangeWeightSlider = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const value = +target.value / 100;
        let checkState = state.weightState.weights[label].checkState;
        if (checkState !== undefined) {
            checkState = true;
        }
        globalState.setWeight({
            block: label,
            value: value,
            checkState: checkState,
        });
    };

    /**
     * Handles the change event for the weight number input.
     * Updates the value and check state for the weight block.
     * @param e - The input change event.
     */
    const handleChangeWeightNumber = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const value = +target.value;
        let checkState = state.weightState.weights[label].checkState;
        if (checkState !== undefined) {
            checkState = true;
        }
        globalState.setWeight({
            block: label,
            value: value,
            checkState: checkState,
        });
    };

    const weightController = values[label];

    /**
     * Live-sync handler for slider @input (does not commit state yet).
     * Mirrors the slider value (scaled back to original 0-? range) into the numeric input
     * so the user sees real-time feedback while dragging before the @change event fires.
     */
    const immediateSliderInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const raw = +target.value / 100;
        const wrapper = target.parentElement as HTMLElement;
        const numberInput = wrapper.querySelector('input.value') as HTMLInputElement | null;
        if (numberInput) numberInput.value = raw.toString();
    };
    /**
     * Live-sync handler for number @input.
     * Expands the slider range first when user enters a value outside current min/max
     * (matching the logic used in setWeight) and then updates the slider thumb position.
     * State commit is deferred to the @change handler.
     */
    const immediateNumberInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const wrapper = target.parentElement as HTMLElement;
        const slider = wrapper.querySelector('input.slider') as HTMLInputElement | null;
        if (!slider) return;
        const raw = +target.value;
        if (isNaN(raw)) return; // Unconfirmed / empty input etc.
        let sliderMin = +slider.min; // Scaled (0-100x) current min
        let sliderMax = +slider.max;
        const scaled = Math.round(raw * 100);
        // Expand range first if the input value is outside (same policy as setWeight)
        if (scaled < sliderMin) sliderMin = scaled;
        if (scaled > sliderMax) sliderMax = scaled;
        if (sliderMin !== +slider.min) slider.min = String(sliderMin);
        if (sliderMax !== +slider.max) slider.max = String(sliderMax);
        // Finally assign the value (no clamp needed after expansion)
        slider.value = String(scaled);
    };
    return html`
        <span>
            <label>${label}</label>
            ${state.weightState.weights[label].checkState !== undefined
                ? html`<input type="checkbox" .checked=${state.weightState.weights[label].checkState} @input=${handleChangeWeightCheck} />`
                : ''}
        </span>
        <div class="f f-c g-4">
            <input
                class="slider"
                type="range"
                .min=${Math.round(weightController.sliderMin * 100)}
                .max=${Math.round(weightController.sliderMax * 100)}
                .step=${Math.round(config.step * 100)}
                .value=${Math.round(weightController.value * 100)}
                ?disabled=${disabled(state, label)}
                @input=${immediateSliderInput}
                @change=${handleChangeWeightSlider}
            />
            <input
                class="value"
                type="number"
                .value=${+weightController.value}
                .step=${config.step}
                ?disabled=${disabled(state, label)}
                @input=${immediateNumberInput}
                @change=${handleChangeWeightNumber}
            />
        </div>
    `;
}
