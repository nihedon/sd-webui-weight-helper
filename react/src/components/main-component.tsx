// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';

import { Dispatch, useEffect, useRef } from 'preact/hooks';

import { CARD_NO_IMAGE_PATH } from '@/shared/constants/common-const';
import { resetMetadataAbortController, resetPreviewAbortController } from '@/shared/manager/api-manager';
import * as cacheManager from '@/shared/manager/cache-manager';
import * as configManager from '@/shared/manager/config-manager';
import * as historyManager from '@/shared/manager/history-manager';
import * as currentState from '@/shared/state/current-state';
import { ModelTypes, WeightControllerTypes } from '@/shared/types/lora-types';
import { fetchMetadata, fetchPreviewData } from '@/shared/utils/api-utils';
import { getLoraDefineFromEditor, getOutputStrings, syncEditorWithState } from '@/shared/utils/editor-utils';
import { disabled, getDisplayStyle } from '@/shared/utils/helper-utils';
import { createWeightHelperInitState, createWeightHelperState } from '@/shared/utils/state-utils';
import { mergeWeightsWithGroups } from '@/shared/utils/weight-utils';

import * as context from '@/components/contexts/weight-helper-context';
import { WeightController } from '@/components/sections/common-section';
import { HeaderSection } from '@/components/sections/header-section';
import { LbwSection } from '@/components/sections/lbw-section';
import { LoraSettingsSection } from '@/components/sections/lora-settings-section';
import { MetadataSection } from '@/components/sections/metadata-section';
import { PreviewSection } from '@/components/sections/preview-section';

/**
 * UITemplateContent is the main component of the Weight Helper UI.
 * Renders all control sections and manages global event listeners.
 * @returns The main Weight Helper UI component.
 */
export const UITemplateContent = () => {
    const { state, dispatch } = context.useWeightHelper();
    const { uiState, weightState, lock, previewState } = state;

    useEffect(() => {
        const handleClickGenButton = () => {
            if (state.uiState.isVisible) {
                closeWeightHelperContext(dispatch);
                syncEditorWithState(state);
            }
        };
        const genButtons = gradioApp().querySelectorAll("button:is([id*='_generate'])");
        genButtons.forEach((genBtn) => {
            genBtn.addEventListener('click', handleClickGenButton, true);
        });

        const handleRightClickTextarea = (e: MouseEvent) => {
            if (state.uiState.isVisible) {
                e.preventDefault();
                closeWeightHelperContext(dispatch);
                syncEditorWithState(state);
                return;
            }
            const loraDefine = getLoraDefineFromEditor(e);
            if (loraDefine) {
                e.preventDefault();
                openWeightHelperContext(dispatch, loraDefine);
            }
        };
        const textareas = gradioApp().querySelectorAll("*:is([id*='_toprow'] [id*='_prompt'], .prompt) textarea") as NodeListOf<HTMLTextAreaElement>;
        textareas.forEach((textarea) => {
            textarea.addEventListener('contextmenu', handleRightClickTextarea);
        });

        const handleClickAnyware = (e: MouseEvent) => {
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
                        closeWeightHelperContext(dispatch);
                        return;
                    }
                }
                closeWeightHelperContext(dispatch);
                syncEditorWithState(state);
            }
        };
        document.addEventListener('click', handleClickAnyware);

        const handleKeyupAnyware = (e: KeyboardEvent) => {
            if ((e as KeyboardEvent).key === 'Escape') {
                cancelWeightHelperContext(state, dispatch);
            }
        };
        document.addEventListener('keyup', handleKeyupAnyware);

        return () => {
            genButtons.forEach((genBtn) => {
                genBtn.removeEventListener('click', handleClickGenButton, true);
            });
            textareas.forEach((textarea) => {
                textarea.removeEventListener('contextmenu', handleRightClickTextarea);
            });
            document.removeEventListener('click', handleClickAnyware);
            document.removeEventListener('keyup', handleKeyupAnyware);
        };
    }, [state]);

    const weightHelperRef = useRef<HTMLDivElement>(null);

    return (
        <div
            id="weight-helper"
            ref={weightHelperRef}
            className={state.uiState.isWaiting ? 'waiting' : ''}
            style={{ transform: `scale(${uiState.scale})`, top: `${uiState.pos.top}px`, left: `${uiState.pos.left}px`, ...getDisplayStyle(uiState.isVisible) }}
        >
            <HeaderSection loraName={state.loraName} lock={lock} />

            <MetadataSection />

            {weightState.weights[WeightControllerTypes.TENC] && (
                <section className="border p">
                    <WeightController label={WeightControllerTypes.TENC} values={weightState.weights} />
                </section>
            )}
            {[WeightControllerTypes.UNET, WeightControllerTypes.START, WeightControllerTypes.STOP].map(
                (weightType) =>
                    weightState.weights[weightType] && (
                        <section
                            className="border p"
                            style={getDisplayStyle(
                                !uiState.isMoreButtonVisible ||
                                    weightState.weights[weightType].initCheckState ||
                                    weightState.weights[weightType].initValue !== configManager.getWeightControllerConfig(weightType).default,
                            )}
                        >
                            <WeightController label={weightType} values={weightState.weights} />
                        </section>
                    ),
            )}

            <button
                style={uiState.isMoreButtonVisible ? {} : { display: 'none' }}
                disabled={disabled(state)}
                onClick={() => dispatch({ type: 'HIDE_MORE_BUTTON' })}
            >
                show more options
            </button>

            <section className="border p">
                <label>LBW</label>
                <div className="f col g-4 w-fill">
                    <LoraSettingsSection />
                    <LbwSection />
                </div>
            </section>

            <PreviewSection preview={previewState} topComponent={weightHelperRef.current} />
        </div>
    );
};

/**
 * Opens the Weight Helper context menu at the given location.
 * Initializes state based on the selected LoRA and fetches metadata if needed.
 * @param dispatch - The dispatch function for state updates.
 * @param loraDefine - The LoRA definition and context information.
 */
function openWeightHelperContext(
    dispatch: Dispatch<context.WeightHelperAction>,
    loraDefine: {
        tabId: string;
        textarea: HTMLTextAreaElement;
        selectionStart: number;
        selectionEnd: number;
        namespace: string;
        loraName: string;
        loraParams: string;
        top: number;
        left: number;
    },
) {
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
    const props = createWeightHelperState(namespace, loraName, loraParams, arrangedTop, left);

    dispatch({ type: 'OPEN_CONTEXT', payload: props });

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
                    dispatch({
                        type: 'SET_HISTORY_INDEX',
                        payload: historyManager.getHistories(loraName).length - 1,
                    });
                }

                dispatch({
                    type: 'LOAD_METADATA',
                    payload: {
                        algorithm: result.algorithm || 'Unknown',
                        modelType: result.modelType || 'Unknown',
                        baseModel: result.baseModel || 'Unknown',
                        selectedModelType: selectedModelType,
                        usingBlocks: result.usingBlocks,
                        blockGroups: blockGroups,
                        lbwPresets: currentState.getLbwPresets(selectedModelType, props.weightState.selectedLoraBlockType),
                        weights: weights,
                    },
                });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching metadata:', error);
                    dispatch({
                        type: 'SET_WAITING',
                        payload: false,
                    });
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
                dispatch({
                    type: 'LOAD_PREVIEW_DATA',
                    payload: result,
                });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching metadata:', error);
                }
            });
    }
}

/**
 * Closes the Weight Helper context menu.
 * Resets state to initial values and updates visibility.
 * @param dispatch - The dispatch function for state updates.
 */
function closeWeightHelperContext(dispatch: Dispatch<context.WeightHelperAction>): void {
    const weightHelperState = createWeightHelperInitState();
    dispatch({ type: 'CLOSE_CONTEXT', payload: weightHelperState });
}

/**
 * Cancels the Weight Helper context menu operation.
 * Optionally syncs editor state before closing.
 * @param state - The current Weight Helper state.
 * @param dispatch - The dispatch function for state updates.
 */
function cancelWeightHelperContext(state: context.BasicState, dispatch: Dispatch<context.WeightHelperAction>): void {
    if (!window.opts.weight_helper_using_execCommand) {
        syncEditorWithState(state, true);
    }
    closeWeightHelperContext(dispatch);
}
