import { CARD_NO_IMAGE_PATH } from '@/shared/constants/common-const';
import { resetMetadataAbortController, resetPreviewAbortController } from '@/shared/manager/api-manager';
import * as cacheManager from '@/shared/manager/cache-manager';
import * as configManager from '@/shared/manager/config-manager';
import * as historyManager from '@/shared/manager/history-manager';
import * as currentState from '@/shared/state/current-state';
import * as globalState from '@/shared/state/global-weight-helper-state';
import { ModelTypes, WeightControllerTypes } from '@/shared/types/lora-types';
import { fetchMetadata, fetchPreviewData } from '@/shared/utils/api-utils';
import { getLoraDefineFromEditor, getOutputStrings, syncEditorWithState } from '@/shared/utils/editor-utils';
import { disabled, getDisplayStyle } from '@/shared/utils/helper-utils';
import { createWeightHelperInitState, createWeightHelperState } from '@/shared/utils/state-utils';
import { mergeWeightsWithGroups } from '@/shared/utils/weight-utils';

import { createWeightController } from '@/components/sections/common-section';
import { createHeaderSection } from '@/components/sections/header-section';
import { createLbwSection } from '@/components/sections/lbw-section';
import { createLoraSettingsSection } from '@/components/sections/lora-settings-section';
import { createMetadataSection } from '@/components/sections/metadata-section';
import { createPreviewSection } from '@/components/sections/preview-section';

import { TemplateResult, html, render } from 'lit-html';

declare function gradioApp(): HTMLElement;

// Track if global (one-time) event listeners were attached
let isEventListenersInitialized = false;

/**
 * Build main Weight Helper UI template.
 * Note: top/left positioning styles are applied imperatively (drag) and excluded from state to avoid re-renders.
 * @returns The main Weight Helper UI template
 */
export function createUITemplate(): TemplateResult {
    const state = globalState.getGlobalState();
    const { uiState, weightState, lock } = state;

    // Attach global listeners only once
    if (!isEventListenersInitialized) {
        setupEventListeners();
        isEventListenersInitialized = true;
    }

    // top/left not included here (managed outside state for performance)
    const containerStyle = `transform: scale(${uiState.scale}); ${getDisplayStyle(uiState.isVisible)}`;

    return html`
        <div id="weight-helper" class="${state.uiState.isWaiting ? 'waiting' : ''}" style="${containerStyle}">
            ${createHeaderSection(state.loraName, lock)} ${createMetadataSection()}
            ${weightState.weights[WeightControllerTypes.TENC] &&
            html`<section class="border p">${createWeightController(WeightControllerTypes.TENC, weightState.weights)}</section>`}
            ${[WeightControllerTypes.UNET, WeightControllerTypes.START, WeightControllerTypes.STOP]
                .filter((wt) => !!weightState.weights[wt])
                .map(
                    (weightType) =>
                        html`<section
                            class="border p"
                            style="${getDisplayStyle(
                                !uiState.isMoreButtonVisible ||
                                    weightState.weights[weightType].initCheckState ||
                                    weightState.weights[weightType].initValue !== configManager.getWeightControllerConfig(weightType).default,
                            )}"
                        >
                            ${createWeightController(weightType, weightState.weights)}
                        </section>`,
                )}

            <button style="${uiState.isMoreButtonVisible ? '' : 'display: none'}" ?disabled="${disabled(state)}" @click="${() => globalState.hideMoreButton()}">
                show more options
            </button>

            <section class="border p">
                <label>LBW</label>
                <div class="f col g-4 w-fill">${createLoraSettingsSection()} ${createLbwSection()}</div>
            </section>

            ${state.previewState.modelName ? createPreviewSection(state.previewState) : ''}
        </div>
    `;
}

/**
 * Register global event listeners (context menu open/close lifecycle, outside click, ESC key, generate button etc.).
 */
function setupEventListeners(): void {
    const handleClickGenButton = () => {
        const state = globalState.getGlobalState();
        if (state.uiState.isVisible) {
            closeWeightHelperContext();
            syncEditorWithState(state);
        }
    };

    const handleRightClickTextarea = (e: MouseEvent) => {
        const state = globalState.getGlobalState();
        if (state.uiState.isVisible) {
            e.preventDefault();
            closeWeightHelperContext();
            syncEditorWithState(state);
            return;
        }
        const loraDefine = getLoraDefineFromEditor(e);
        if (loraDefine) {
            e.preventDefault();
            openWeightHelperContext(loraDefine);
        }
    };

    const handleClickAnyware = (e: MouseEvent) => {
        const state = globalState.getGlobalState();
        if (state.uiState.isVisible) {
            const contextMenuElement = document.getElementById('weight-helper');
            if (!contextMenuElement) return;
            const tabId = currentState.getTabId();
            if (e) {
                const target = e.target as HTMLBodyElement;
                if (contextMenuElement.contains(target)) return;
                if (target.id === `${tabId}_token_button`) return;
                if (target.id === `${tabId}_lora_edit_user_metadata_button`) return;
                if (target.className === 'global-popup-close') return;
                if (target.id.indexOf('_interrupt') > 0) {
                    closeWeightHelperContext();
                    return;
                }
            }
            closeWeightHelperContext();
            syncEditorWithState(state);
        }
    };

    const handleKeyupAnyware = (e: KeyboardEvent) => {
        if ((e as KeyboardEvent).key === 'Escape') {
            const state = globalState.getGlobalState();
            cancelWeightHelperContext(state);
        }
    };

    // Attach listeners to generate buttons & prompt textareas
    const genButtons = gradioApp().querySelectorAll("button:is([id*='_generate'])");
    genButtons.forEach((genBtn) => {
        genBtn.addEventListener('click', handleClickGenButton, true);
    });

    const textareas = gradioApp().querySelectorAll("*:is([id*='_toprow'] [id*='_prompt'], .prompt) textarea") as NodeListOf<HTMLTextAreaElement>;
    textareas.forEach((textarea) => {
        textarea.addEventListener('contextmenu', handleRightClickTextarea);
    });

    document.addEventListener('click', handleClickAnyware);
    document.addEventListener('keyup', handleKeyupAnyware);
}

// One-time flag for state watching → subscribe only once
let isStateWatchingInitialized = false;

/**
 * Render (and set up subscriptions) of the UI into container.
 * Full state changes trigger template re-render; position changes only mutate style.
 * @param container Target DOM element
 */
export function renderUI(container: HTMLElement): void {
    // 初期レンダリング
    render(createUITemplate(), container);

    // 状態変化を監視して自動再レンダリング（一度だけ設定）
    if (!isStateWatchingInitialized) {
        // Subscribe to full state updates
        globalState.subscribeToStateChanges(() => {
            render(createUITemplate(), container);
        });

        // Subscribe to position-only updates (avoid re-render)
        globalState.subscribeToPositionChanges((pos) => {
            const el = container.querySelector('#weight-helper') as HTMLDivElement;
            if (!el) return;
            el.style.top = pos.top + 'px';
            el.style.left = pos.left + 'px';
        });

        isStateWatchingInitialized = true;
    }
}

/**
 * Open Weight Helper context at given coordinates and load metadata / preview lazily.
 */
function openWeightHelperContext(loraDefine: {
    tabId: string;
    textarea: HTMLTextAreaElement;
    selectionStart: number;
    selectionEnd: number;
    namespace: string;
    loraName: string;
    loraParams: string;
    top: number;
    left: number;
}) {
    const { tabId, textarea, selectionStart, selectionEnd, namespace, loraName, loraParams, top, left } = loraDefine;

    currentState.setTabId(tabId);
    currentState.setEditor(textarea);
    currentState.setSelectionStart(selectionStart);
    currentState.setSelectionEnd(selectionEnd);
    currentState.setLoraDefineString(textarea.value.substring(selectionStart, selectionEnd));

    currentState.loadStep(tabId);
    currentState.loadLbwPresets(tabId);

    configManager.getWeightControllerConfig(WeightControllerTypes.START).max = currentState.getStep();
    configManager.getWeightControllerConfig(WeightControllerTypes.STOP).max = currentState.getStep();
    configManager.getWeightControllerConfig(WeightControllerTypes.STOP).default = currentState.getStep();

    const rect = document.getElementById('weight-helper')!.getBoundingClientRect();
    const diffBottom = window.innerHeight - rect.bottom;
    let arrangedTop = top;
    if (diffBottom < 0) {
        if (rect.top < 0) {
            arrangedTop = window.scrollY;
        } else {
            arrangedTop += diffBottom;
        }
    }
    const props = createWeightHelperState(namespace, loraName, loraParams);

    globalState.openContext(props);
    // Apply position directly (not part of state)
    const container = document.getElementById('weight-helper');
    if (container) {
        container.style.top = arrangedTop + 'px';
        container.style.left = left + 'px';
    }

    if (!props.metadataState) {
        const metadataAbortController = resetMetadataAbortController();
        fetchMetadata(loraName, false, metadataAbortController.signal)
            .then((result) => {
                let selectedModelType = props.weightState.selectedModelType;
                if (!selectedModelType || selectedModelType === ModelTypes.Unknown) {
                    selectedModelType = result.modelType ?? ModelTypes.Unknown;
                }
                const selectedLoraBlockType = props.weightState.selectedLoraBlockType;
                const blockGroups = configManager.getLbwBlockGroups(selectedModelType, selectedLoraBlockType);
                const weights = mergeWeightsWithGroups(props.weightState.weights, blockGroups);

                const weightState = {
                    ...props.weightState,
                    selectedModelType: selectedModelType,
                    selectedLoraBlockType: selectedLoraBlockType,
                };
                const loraParams = getOutputStrings(props.loraName, weightState).loraParams;
                if (!props.weightState.xyzMode) {
                    historyManager.addHistory(loraName, {
                        loraParams: loraParams,
                        selectedLoraBlockType: selectedLoraBlockType,
                        selectedModelType: selectedModelType,
                    });
                    globalState.setHistoryIndex(historyManager.getHistories(loraName).length - 1);
                }

                globalState.loadMetadata({
                    algorithm: result.algorithm || 'Unknown',
                    modelType: result.modelType || 'Unknown',
                    baseModel: result.baseModel || 'Unknown',
                    selectedModelType: selectedModelType,
                    usingBlocks: result.usingBlocks,
                    blockGroups: blockGroups,
                    lbwPresets: currentState.getLbwPresets(selectedModelType, props.weightState.selectedLoraBlockType),
                    weights: weights,
                });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching metadata:', error);
                    globalState.setWaiting(false);
                }
            });
    }

    if (!props.previewState.modelId) {
        const previewAbortController = resetPreviewAbortController();
        fetchPreviewData(loraName, previewAbortController.signal)
            .then(async (result) => {
                if (result.thumbUrl !== CARD_NO_IMAGE_PATH) {
                    result.thumbUrl = result.thumbUrl;
                }
                cacheManager.setPreviewCache(loraName, result);
                globalState.loadPreviewData(result);
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching metadata:', error);
                }
            });
    }
}

/** Close context menu and reset to initial hidden state. */
function closeWeightHelperContext(): void {
    const weightHelperState = createWeightHelperInitState();
    globalState.closeContext(weightHelperState);
}

/** Cancel editing: revert editor text (if enabled) then close. */
function cancelWeightHelperContext(state: globalState.BasicState): void {
    if (!opts.weight_helper_using_execCommand) {
        syncEditorWithState(state, true);
    }
    closeWeightHelperContext();
}
