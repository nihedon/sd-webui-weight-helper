import * as configManager from '@/shared/manager/config-manager';
import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';

let _tabId: string;
let _editor: HTMLTextAreaElement;
let _selectionStart: number;
let _selectionEnd: number;
let _loraDefineString: string;
let _lbwPresetsMap: Record<string, Record<string, Record<string, string>>> = {};
let _step: number = 0;

/**
 * Gets the current tab ID.
 * @returns The tab ID string.
 */
export function getTabId(): string {
    return _tabId;
}

/**
 * Sets the current tab ID.
 * @param tabId - The tab ID string.
 */
export function setTabId(tabId: string): void {
    _tabId = tabId;
}

/**
 * Gets the current editor textarea element.
 * @returns The HTMLTextAreaElement for the editor.
 */
export function getEditor(): HTMLTextAreaElement {
    return _editor;
}

/**
 * Sets the current editor textarea element.
 * @param e - The HTMLTextAreaElement to set as the editor.
 */
export function setEditor(e: HTMLTextAreaElement): void {
    _editor = e;
}

/**
 * Gets the current selection start index in the editor.
 * @returns The selection start index.
 */
export function getSelectionStart(): number {
    return _selectionStart;
}

/**
 * Sets the selection start index in the editor.
 * @param selectionStart - The selection start index.
 */
export function setSelectionStart(selectionStart: number): void {
    _selectionStart = selectionStart;
}

/**
 * Gets the current selection end index in the editor.
 * @returns The selection end index.
 */
export function getSelectionEnd(): number {
    return _selectionEnd;
}

/**
 * Sets the selection end index in the editor.
 * @param selectionEnd - The selection end index.
 */
export function setSelectionEnd(selectionEnd: number): void {
    _selectionEnd = selectionEnd;
}

/**
 * Gets the current LoRA define string from the editor.
 * @returns The LoRA define string.
 */
export function getLoraDefineString(): string {
    return _loraDefineString;
}

/**
 * Sets the current LoRA define string in the editor.
 * @param loraDefineString - The LoRA define string to set.
 */
export function setLoraDefineString(loraDefineString: string): void {
    _loraDefineString = loraDefineString;
}

/**
 * Gets the current step value from the editor.
 * @returns The step value as a number.
 */
export function getStep(): number {
    return _step || 0;
}

/**
 * Loads the step value from the editor UI for the specified tab ID.
 * @param tabId - The tab ID string.
 */
export function loadStep(tabId: string) {
    const tab = gradioApp().querySelector(`div:is([id^='tab_${tabId}'][class*='tabitem'])`) as HTMLDivElement;
    const input = tab.querySelector('div:is([id$="_steps"]) input[type=number]') as HTMLInputElement;
    _step = +input.value;
}

/**
 * Gets the LBW presets for the specified model and block type.
 * @param selectedModelType - The selected model type.
 * @param selectedLoraBlockType - The selected LoRA block type.
 * @returns A record of preset names to values.
 */
export function getLbwPresets(selectedModelType: ModelTypes, selectedLoraBlockType: LoraBlockTypes): Record<string, string> {
    return _lbwPresetsMap[selectedModelType || ModelTypes.Unknown][selectedLoraBlockType || LoraBlockTypes.Unknown];
}

/**
 * Loads the LBW presets from the editor UI for the specified tab ID.
 * @param tabId - The tab ID string.
 */
export function loadLbwPresets(tabId: string) {
    const tab = gradioApp().querySelector(`div:is([id^='tab_${tabId}'][class*='tabitem'])`) as HTMLDivElement;
    const textarea = tab.querySelector('#lbw_ratiospreset textarea') as HTMLTextAreaElement;
    const lbwPresetValue = textarea.value ?? '';
    const lbwPresets = lbwPresetValue.split('\n').filter((e) => e.trim() !== '');

    const lbwPresetsMap: Record<string, Record<string, Record<string, string>>> = {};
    for (const modelType of Object.values(ModelTypes)) {
        lbwPresetsMap[modelType] = {};
        for (const loraBlockType of Object.values(LoraBlockTypes)) {
            const lbwPreset: Record<string, string> = {};
            const lbwPresetValueKey: Record<string, string> = {};

            lbwPresetsMap[modelType][loraBlockType] = lbwPreset;

            const blockLength = configManager.getLbwMasks(modelType, loraBlockType).filter((b) => b == 1).length;
            for (const line of lbwPresets) {
                const kv = line.split(':');
                if (kv.length == 2 && kv[1].split(',').length == blockLength) {
                    lbwPreset[kv[0]] = kv[1];
                    lbwPresetValueKey[kv[1]] = kv[0];
                }
            }
        }
    }
    _lbwPresetsMap = lbwPresetsMap;
}
