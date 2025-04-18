import * as cacheManager from '@/shared/manager/cache-manager';
import * as configManager from '@/shared/manager/config-manager';
import * as historyManager from '@/shared/manager/history-manager';
import * as currentState from '@/shared/state/current-state';
import { ModelTypes, WeightControllerTypes } from '@/shared/types/lora-types';
import { withoutPromptAssist } from '@/shared/utils/common-utils';
import { lower } from '@/shared/utils/helper-utils';

import * as context from '@/components/contexts/weight-helper-context';

const REGEX = /<(lora|lyco):([^:]+):([^>]+)>/;

/**
 * Extracts the LoRA definition from the editor based on the mouse event position.
 * @param e - The mouse event from the context menu.
 * @returns Context information if a valid LoRA/lyco tag is found at the cursor position, or undefined if not found.
 */
export function getLoraDefineFromEditor(e: MouseEvent):
    | {
          tabId: string;
          textarea: HTMLTextAreaElement;
          selectionStart: number;
          selectionEnd: number;
          namespace: string;
          loraName: string;
          loraParams: string;
          top: number;
          left: number;
      }
    | undefined {
    const textarea = e.target as HTMLTextAreaElement;
    if (!window.opts.weight_helper_enabled) {
        return undefined;
    }
    let selectedText = window.getSelection()?.toString();
    if (selectedText) {
        return undefined;
    }
    const prompt = textarea.value;
    let tmpSelectionStart = textarea.selectionStart;
    const lCar = prompt.lastIndexOf('<', tmpSelectionStart - 1);
    const rCar = prompt.indexOf('>', tmpSelectionStart);
    if (lCar < 0 || rCar < 0) {
        return undefined;
    }
    selectedText = prompt.substring(lCar, rCar + 1) as string;
    if ((selectedText.match(/</g) || []).length != 1 || (selectedText.match(/>/g) || []).length != 1) {
        return undefined;
    }
    tmpSelectionStart = lCar;
    const match = REGEX.exec(selectedText);
    if (match) {
        e.preventDefault();
        const namespace = match[1].toLowerCase();
        const loraName = match[2];
        const loraParams = match[3];

        const tabId = textarea.closest("[id^='tab_'][class*='tabitem']")!.id.split('_')[1];
        const selectionStart = tmpSelectionStart + match.index;
        const selectionEnd = selectionStart + match.input.trim().length;

        return {
            tabId: tabId,
            textarea: textarea,
            selectionStart: selectionStart,
            selectionEnd: selectionEnd,
            namespace: namespace,
            loraName: loraName,
            loraParams: loraParams,
            top: (e.pageY + 15) as number,
            left: e.pageX as number,
        };
    }
    return undefined;
}

/**
 * Updates the editor textarea with the given text at the current selection.
 * @param updatedText - The text to insert into the editor.
 */
export function updateEditor(updatedText: string): void {
    const textarea = currentState.getEditor();
    const start = currentState.getSelectionStart();
    const end = currentState.getSelectionEnd();
    textarea.value = textarea.value.substring(0, start) + updatedText + textarea.value.substring(end);
    currentState.setSelectionEnd(start + updatedText.length);
}

/**
 * Updates the editor textarea with the given text using execCommand.
 * Uses this method to ensure compatibility with certain browser features.
 * @param updatedText - The text to insert into the editor.
 */
export function updateEditorWithExecCommand(updatedText: string): void {
    withoutPromptAssist(() => {
        const textarea = currentState.getEditor();
        const start = currentState.getSelectionStart();
        const end = currentState.getSelectionEnd();
        textarea.focus();
        textarea.setSelectionRange(start, end);
        document.execCommand('insertText', false, updatedText);
    });
}

/**
 * Generates output strings for the current LoRA configuration.
 * @param loraName - The name of the LoRA model.
 * @param weightState - The current weight state.
 * @returns An object containing the loraParams string and the complete LoRA tag.
 */
export function getOutputStrings(
    loraName: string,
    weightState: context.WeightState,
): {
    loraParams: string;
    loraDefine: string;
} {
    let updatedText = String(weightState.weights[WeightControllerTypes.TENC].value);
    let refIdx = 0;
    let idx = 0;
    for (const keyType of [WeightControllerTypes.UNET, WeightControllerTypes.DYN]) {
        const weight = weightState.weights[keyType];
        const defVal = configManager.getWeightControllerConfig(keyType as WeightControllerTypes).default;
        const val = +weight.value;
        if (weight.checkState || (weight.checkState === undefined && val != defVal)) {
            if (idx === refIdx) {
                updatedText += `:${val}`;
            } else {
                updatedText += `:${lower(keyType)}=${val}`;
            }
            refIdx++;
        }
        idx++;
    }
    const startDefVal = configManager.getWeightControllerConfig(WeightControllerTypes.START).default;
    const startVal = weightState.weights[WeightControllerTypes.START].value;
    const stopDefVal = configManager.getWeightControllerConfig(WeightControllerTypes.STOP).default;
    let stopVal = weightState.weights[WeightControllerTypes.STOP].value;
    if (stopVal < 0) {
        stopVal = configManager.getWeightControllerConfig(WeightControllerTypes.STOP).default;
    }
    if (startVal != startDefVal && stopVal != stopDefVal) {
        updatedText += `:step=${startVal}-${stopVal}`;
    } else if (startVal != startDefVal) {
        updatedText += `:start=${startVal}`;
    } else if (stopVal != stopDefVal) {
        updatedText += `:stop=${stopVal}`;
    }

    const { selectedModelType, selectedLoraBlockType } = weightState;
    const xyzValue = weightState.xyzMode;

    let updatedTextWithPreset = updatedText;
    if (xyzValue) {
        updatedText += `:lbw=XYZ`;
        updatedTextWithPreset += `:lbw=XYZ`;
    } else if (selectedModelType !== ModelTypes.Unknown) {
        const lbwWeights = configManager
            .getLbwMasks(selectedModelType, selectedLoraBlockType)
            .map((mask, i) => {
                if (mask === 1) {
                    return weightState.weights[configManager.getLbwBlocks(selectedModelType)[i]];
                }
                return undefined;
            })
            .filter((block) => block !== undefined);
        const lbwDefault = configManager.getWeightControllerConfig(WeightControllerTypes.LBW).default;
        if (!lbwWeights.every((weight) => weight.value === lbwDefault)) {
            const lbwValues = lbwWeights.map((weight) => weight.value).join(',');

            updatedText += `:lbw=${lbwValues}`;
            const lbwPresets = currentState.getLbwPresets(selectedModelType, selectedLoraBlockType);
            const preset = Object.entries(lbwPresets).find(([, value]) => lbwValues === value);
            if (preset) {
                updatedTextWithPreset += `:lbw=${preset[0]}`;
            } else {
                updatedTextWithPreset += `:lbw=${lbwValues}`;
            }
        }
    }
    if (weightState.lbwe) {
        updatedText += `:lbwe=${weightState.lbwe}`;
        updatedTextWithPreset += `:lbwe=${weightState.lbwe}`;
    }
    return {
        loraParams: updatedText,
        loraDefine: `<lora:${loraName}:${updatedTextWithPreset}>`,
    };
}

/**
 * Synchronizes the editor with the current Weight Helper state.
 * Updates the cache and history, and optionally cancels changes.
 * @param state - The current Weight Helper state.
 * @param cancel - When true, cancels changes and restores the original editor content.
 */
export function syncEditorWithState(state: context.BasicState, cancel: boolean = false): void {
    const outputStrings = getOutputStrings(state.loraName, state.weightState);
    if (!window.opts.weight_helper_using_execCommand) {
        if (cancel) {
            updateEditor(currentState.getLoraDefineString());
        }
    } else {
        if (state.srcLoraParams !== outputStrings.loraParams) {
            updateEditorWithExecCommand(outputStrings.loraDefine);
        }
    }
    cacheManager.setMetadataCache(state.loraName, state);
    if (!state.weightState.xyzMode) {
        historyManager.addHistory(state.loraName, { loraParams: outputStrings.loraParams, ...state.weightState });
    }
    historyManager.storeLocalStorage();
}
