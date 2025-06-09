import { FunctionComponent, h, render } from 'preact';

import { createContext } from 'preact/compat';
import { Dispatch, useContext, useReducer } from 'preact/hooks';

import * as historyManager from '@/shared/manager/history-manager';
import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';
import { getPreset } from '@/shared/utils/common-utils';
import { getOutputStrings, updateEditor } from '@/shared/utils/editor-utils';

import { UITemplateContent } from '@/components/main-component';

export interface BasicState {
    loraName: string;
    metadataState: MetadataState | undefined;
    srcLoraParams: string;
    weightState: WeightState;
    blockGroups: string[][];
    preset: string;
    lbwPresets: Record<string, string>;
    usingBlocks: Set<string> | undefined;
    uiState: UiState;
    lock: boolean;
    historyIndex: number;
    previewState: PreviewState;
}

export interface MetadataState {
    baseModel: string;
    modelType: string;
    algorithm: string;
}

export interface WeightState {
    selectedModelType: ModelTypes;
    selectedLoraBlockType: LoraBlockTypes;
    weights: Record<string, WeightControlState>;
    lbwe: string;
    xyzMode: boolean;
}

export interface WeightControlState {
    initValue: number;
    value: number;
    sliderMin: number;
    sliderMax: number;
    initCheckState?: boolean | undefined;
    checkState?: boolean | undefined;
}

export interface UiState {
    isVisible: boolean;
    scale: number;
    isMoreButtonVisible: boolean;
    isWaiting: boolean;
    pos: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}

export interface PreviewState {
    modelId: string;
    triggerWords: string[];
    negativeTriggerWords: string[];
    modelName: string;
    thumbUrl: string;
    hasMetadata: boolean;
    description: string;
    isDescriptionVisible: boolean;
    isTagInsertButtonVisible: boolean;
}

export type WeightHelperAction =
    | { type: 'OPEN_CONTEXT'; payload: BasicState }
    | { type: 'CLOSE_CONTEXT'; payload: BasicState }
    | {
          type: 'SET_POSITION';
          payload: {
              top: number;
              left: number;
          };
      }
    | {
          type: 'LOAD_METADATA';
          payload: {
              algorithm: string;
              baseModel: string;
              modelType: string;
              selectedModelType: ModelTypes;
              usingBlocks: string[] | null | undefined;
              blockGroups: string[][];
              weights: Record<string, WeightControlState>;
              lbwPresets: Record<string, string>;
          };
      }
    | { type: 'SET_WAITING'; payload: boolean }
    | {
          type: 'SET_MODELINFO';
          payload: {
              selectedModelType: ModelTypes;
              selectedLoraBlockType: LoraBlockTypes;
              blockGroups: string[][];
              lbwPresets: Record<string, string>;
              weights: Record<string, WeightControlState>;
          };
      }
    | { type: 'SET_MODEL_TYPE'; payload: ModelTypes }
    | { type: 'TOGGLE_XYZ_MODE' }
    | { type: 'SET_PRESET'; payload: { weights: Record<string, WeightControlState>; preset: string } }
    | { type: 'TOGGLE_LOCK_STATUS' }
    | {
          type: 'SET_HISTORY';
          payload: {
              historyIndex: number;
              weightState: {
                  selectedModelType: ModelTypes;
                  selectedLoraBlockType: LoraBlockTypes;
                  weights: Record<string, WeightControlState>;
                  lbwe: string;
                  xyzMode: boolean;
              };
              preset: string;
              locked: boolean;
          };
      }
    | { type: 'SET_HISTORY_INDEX'; payload: number }
    | {
          type: 'SET_WEIGHT';
          payload: {
              block: string;
              value: number;
              checkState?: boolean;
          };
      }
    | { type: 'HIDE_MORE_BUTTON' }
    | { type: 'CLEAR_HISTORY' }
    | {
          type: 'LOAD_PREVIEW_DATA';
          payload: PreviewState;
      }
    | {
          type: 'SET_PREVIEW_DESCRIPTION_VISIBLE';
          payload: boolean;
      }
    | {
          type: 'HIDE_TAG_INSERT_BUTTON';
      };

const WeightHelperContext = createContext<{
    state: BasicState;
    dispatch: Dispatch<WeightHelperAction>;
} | null>(null);

export const useWeightHelper = () => {
    const context = useContext(WeightHelperContext);
    if (!context) {
        throw new Error('useWeightHelper must be used within a WeightHelperProvider');
    }
    return context;
};

export const WeightHelperProvider: FunctionComponent<{
    weightHelperState: BasicState;
    children: h.JSX.Element | h.JSX.Element[];
}> = ({ weightHelperState, children }) => {
    const [state, dispatch] = useReducer(weightHelperReducer, weightHelperState);

    return <WeightHelperContext.Provider value={{ state, dispatch }}>{children}</WeightHelperContext.Provider>;
};

const weightHelperReducer = (state: BasicState, action: WeightHelperAction): BasicState => {
    if (action.type === 'OPEN_CONTEXT') {
        return action.payload;
    } else if (action.type === 'CLOSE_CONTEXT') {
        return action.payload;
    } else if (action.type === 'SET_POSITION') {
        return {
            ...state,
            uiState: {
                ...state.uiState,
                pos: {
                    ...state.uiState.pos,
                    top: action.payload.top,
                    left: action.payload.left,
                },
            },
        };
    } else if (action.type === 'LOAD_METADATA') {
        const newState = {
            ...state,
            metadataState: {
                ...state.metadataState,
                algorithm: action.payload.algorithm || 'Unknown',
                baseModel: action.payload.baseModel || 'Unknown',
                modelType: action.payload.modelType || 'Unknown',
            },
            weightState: {
                ...state.weightState,
                selectedModelType: action.payload.selectedModelType,
                weights: action.payload.weights,
            },
            blockGroups: action.payload.blockGroups,
            lbwPresets: action.payload.lbwPresets,
            uiState: {
                ...state.uiState,
                isWaiting: false,
            },
        };
        if (action.payload.usingBlocks === null) {
            newState.usingBlocks = undefined;
        } else if (action.payload.usingBlocks) {
            newState.usingBlocks = new Set(action.payload.usingBlocks);
        }
        return newState;
    } else if (action.type === 'SET_WAITING') {
        return {
            ...state,
            uiState: {
                ...state.uiState,
                isWaiting: action.payload,
            },
        };
    } else if (action.type === 'SET_MODELINFO') {
        const newState = {
            ...state,
            weightState: {
                ...state.weightState,
                selectedLoraBlockType: action.payload.selectedLoraBlockType,
                selectedModelType: action.payload.selectedModelType,
                weights: action.payload.weights,
            },
            blockGroups: action.payload.blockGroups,
            lbwPresets: action.payload.lbwPresets,
        };
        if (!window.opts.weight_helper_using_execCommand) {
            updateEditor(getOutputStrings(newState.loraName, newState.weightState).loraDefine);
        }

        return newState;
    } else if (action.type === 'TOGGLE_XYZ_MODE') {
        const newState = {
            ...state,
            weightState: {
                ...state.weightState,
                xyzMode: !state.weightState.xyzMode,
            },
        };
        if (!window.opts.weight_helper_using_execCommand) {
            updateEditor(getOutputStrings(newState.loraName, newState.weightState).loraDefine);
        }

        return newState;
    } else if (action.type === 'SET_PRESET') {
        const weightState = {
            ...state.weightState,
            weights: {
                ...state.weightState.weights,
                ...action.payload.weights,
            },
        };
        const outputStrings = getOutputStrings(state.loraName, weightState);
        const locked = historyManager.isLocked(state.loraName, outputStrings.loraParams);

        const newState = {
            ...state,
            weightState: weightState,
            preset: action.payload.preset,
            lock: locked,
        };
        if (!window.opts.weight_helper_using_execCommand) {
            updateEditor(outputStrings.loraDefine);
        }

        return newState;
    } else if (action.type === 'TOGGLE_LOCK_STATUS') {
        const outputLoraParams = getOutputStrings(state.loraName, state.weightState).loraParams;
        const locked = historyManager.isLocked(state.loraName, outputLoraParams);
        if (locked) {
            historyManager.removeLock(state.loraName, outputLoraParams);
        } else {
            historyManager.addLock(state.loraName, outputLoraParams);
        }
        return {
            ...state,
            lock: !locked,
        };
    } else if (action.type === 'SET_HISTORY') {
        const { locked, historyIndex, preset } = action.payload;
        const { selectedLoraBlockType: selectedLoraBlockType, selectedModelType: selectedModelType, weights, lbwe, xyzMode } = action.payload.weightState;
        const weightState = {
            ...state.weightState,
            weights: {
                ...state.weightState.weights,
                ...weights,
            },
            selectedLoraBlockType: selectedLoraBlockType,
            selectedModelType: selectedModelType,
            lbwe: lbwe,
            xyzMode: xyzMode,
        };
        const newState = {
            ...state,
            historyIndex: historyIndex,
            preset: preset,
            weightState: weightState,
            lock: locked,
        };
        if (!window.opts.weight_helper_using_execCommand) {
            updateEditor(getOutputStrings(newState.loraName, newState.weightState).loraDefine);
        }

        return newState;
    } else if (action.type === 'SET_HISTORY_INDEX') {
        return {
            ...state,
            historyIndex: action.payload,
        };
    } else if (action.type === 'SET_WEIGHT') {
        state.weightState.xyzMode = false;
        const weights = {
            ...state.weightState.weights,
            [action.payload.block]: {
                ...state.weightState.weights[action.payload.block],
                value: action.payload.value,
                min: Math.min(action.payload.value, state.weightState.weights[action.payload.block].sliderMin),
                max: Math.max(action.payload.value, state.weightState.weights[action.payload.block].sliderMax),
                checkState: action.payload.checkState,
            },
        };
        const weightState = {
            ...state.weightState,
            weights,
            xyzMode: false,
        };

        const outputStrings = getOutputStrings(state.loraName, weightState);
        const locked = historyManager.isLocked(state.loraName, outputStrings.loraParams);

        const newState = {
            ...state,
            weightState: weightState,
            preset: getPreset(state.weightState.selectedModelType, state.weightState.selectedLoraBlockType, state.lbwPresets, weights),
            lock: locked,
        };
        if (!window.opts.weight_helper_using_execCommand) {
            updateEditor(outputStrings.loraDefine);
        }

        return newState;
    } else if (action.type === 'HIDE_MORE_BUTTON') {
        return {
            ...state,
            uiState: {
                ...state.uiState,
                isMoreButtonVisible: false,
            },
        };
    } else if (action.type === 'CLEAR_HISTORY') {
        historyManager.clearHistories(state.loraName);
        if (!state.weightState.xyzMode) {
            historyManager.addHistory(state.loraName, { loraParams: getOutputStrings(state.loraName, state.weightState).loraParams, ...state.weightState });
        }
        const historyIndex = historyManager.getHistories(state.loraName).length - 1;
        return {
            ...state,
            historyIndex: historyIndex < 0 ? 0 : historyIndex,
        };
    } else if (action.type === 'LOAD_PREVIEW_DATA') {
        return {
            ...state,
            previewState: action.payload,
        };
    } else if (action.type === 'SET_PREVIEW_DESCRIPTION_VISIBLE') {
        return {
            ...state,
            previewState: {
                ...state.previewState,
                isDescriptionVisible: action.payload,
            },
        };
    } else if (action.type === 'HIDE_TAG_INSERT_BUTTON') {
        return {
            ...state,
            previewState: {
                ...state.previewState,
                isTagInsertButtonVisible: false,
            },
        };
    } else {
        return state;
    }
};

export function initialize(weightHelperProps: BasicState): void {
    render(
        <WeightHelperProvider weightHelperState={weightHelperProps}>
            <UITemplateContent />
        </WeightHelperProvider>,
        document.getElementById('weight-helper-container')!,
    );
}
