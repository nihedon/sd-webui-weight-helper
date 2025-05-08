import * as configManager from '@/shared/manager/config-manager';
import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';

/**
 * Returns the preset name that matches the given weights for the selected model and block type.
 * @param selectedModelType - The selected model type.
 * @param selectedLoraBlockType - The selected LoRA block type.
 * @param lbwPresets - The record of preset names to values.
 * @param weights - The record of block weights.
 * @returns The matching preset name, or an empty string if no match is found.
 */
export function getPreset(
    selectedModelType: ModelTypes,
    selectedLoraBlockType: LoraBlockTypes,
    lbwPresets: Record<string, string>,
    weights: Record<string, { value: number; checkState?: boolean }>,
): string {
    const maskedBlockSet = new Set(configManager.getMaskedLbwBlocks(selectedModelType, selectedLoraBlockType));
    const weightValue = Object.entries(weights)
        .filter(([key]) => maskedBlockSet.has(key))
        .map((entries) => entries[1].value)
        .join(',');
    const foundPreset = Object.entries(lbwPresets).find(([, value]) => value === weightValue);
    if (foundPreset) {
        return foundPreset[0];
    }
    return '';
}

/**
 * Temporarily disables prompt assist features (TagAutocomplete, pilot) while executing the given function.
 * Saves the original state, executes the function, then restores the original state.
 * @param func - The function to execute with prompt assist disabled.
 */
export function withoutPromptAssist(func: () => void): void {
    let tacActiveInOrg: boolean | undefined;
    const tacEnabled = typeof window.TAC_CFG !== 'undefined' && window.TAC_CFG;

    let pilotOrg: boolean | undefined;
    const pilotEnabled = typeof window.pilotIsActive !== 'undefined' && window.pilotIsActive;
    try {
        if (tacEnabled) {
            tacActiveInOrg = window.TAC_CFG.activeIn.global;
            window.TAC_CFG.activeIn.global = false;
        }
        if (pilotEnabled) {
            pilotOrg = window.pilotIsActive;
            window.pilotIsActive = false;
        }
        func();
    } finally {
        if (tacEnabled) {
            window.TAC_CFG.activeIn.global = tacActiveInOrg;
        }
        if (pilotEnabled) {
            window.pilotIsActive = pilotOrg;
        }
    }
}

/**
 * Computes a simple hash code for the given string.
 * Uses a bitwise XOR and shift algorithm to generate a 32-bit integer hash.
 * @param s - The input string.
 * @returns The computed hash code as a number.
 */
export function strHashCode(s: string): number {
    let hash = 0;
    if (!s) return hash;
    for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = hash ^ char;
        hash = (hash << 5) - hash;
    }
    return hash & 0xffffffff;
}
