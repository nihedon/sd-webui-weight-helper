import { WeightControllerTypes } from '@/shared/types/lora-types';

import * as context from '@/components/contexts/weight-helper-context';

/**
 * Converts a string to lowercase.
 * @param str - The string to convert.
 * @returns The lowercase version of the string.
 */
export const lower = (str: string) => str.toLowerCase();

/**
 * Returns a style object to control the display property.
 * @param visible - When true, returns an empty object; when false, sets display to 'none'.
 * @returns A CSS style object.
 */
export const getDisplayStyle = (visible: boolean) => (visible ? {} : { display: 'none' });

/**
 * Returns a style object to control the visibility property.
 * @param visible - When true, returns an empty object; when false, sets visibility to 'hidden'.
 * @returns A CSS style object.
 */
export const getVisibilityStyle = (visible: boolean) => (visible ? {} : { visibility: 'hidden' });

/**
 * Determines if a weight controller should be disabled based on the current state and block label.
 * @param state - The current BasicState.
 * @param blockLabel - Optional label of the weight block.
 * @returns True if the controller should be disabled, false otherwise.
 */
export const disabled = (state: context.BasicState, blockLabel: string | undefined = undefined) => {
    if (state.uiState.isWaiting) {
        return true;
    }
    switch (blockLabel) {
        case WeightControllerTypes.TENC:
        case WeightControllerTypes.UNET:
        case WeightControllerTypes.DYN:
        case WeightControllerTypes.START:
        case WeightControllerTypes.STOP:
        case undefined:
            return false;
    }
    return state.usingBlocks !== undefined && !state.usingBlocks.has(blockLabel);
};
