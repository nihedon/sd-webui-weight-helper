// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';

import { useRef } from 'preact/hooks';

import * as historyManager from '@/shared/manager/history-manager';
import { getPreset } from '@/shared/utils/common-utils';
import { getDisplayStyle, getVisibilityStyle } from '@/shared/utils/helper-utils';
import { createLoraParamsState } from '@/shared/utils/state-utils';

import * as context from '@/components/contexts/weight-helper-context';

/**
 * HeaderSection component displays the title bar of the Weight Helper.
 * Provides LoRA name display, lock toggle, and history navigation controls.
 * @param loraName - The name of the LoRA model.
 * @param lock - The current lock status.
 * @returns The HeaderSection component.
 */
export const HeaderSection = ({ loraName, lock }: { loraName: string; lock: boolean }) => {
    const { state, dispatch } = context.useWeightHelper();

    const histories = historyManager.getHistories(state.loraName);

    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    /**
     * Handles the mouse down event for dragging the header.
     * @param e - The mouse event.
     */
    const handleMouseDown = (e: MouseEvent) => {
        isDragging.current = true;
        offset.current = {
            x: e.clientX - state.uiState.pos.left + window.scrollX,
            y: e.clientY - state.uiState.pos.top + window.scrollY,
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    /**
     * Handles the mouse move event for dragging the header.
     * Updates the position of the header based on mouse movement.
     * @param e - The mouse event.
     */
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;

        const x = e.clientX - offset.current.x + window.scrollX;
        const y = e.clientY - offset.current.y + window.scrollY;

        dispatch({ type: 'SET_POSITION', payload: { top: y, left: x } });
    };

    /**
     * Handles the mouse up event to stop dragging the header.
     * Removes the event listeners for mouse move and mouse up.
     */
    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    /**
     * Handles the clear history button click event.
     * Clears the history of the Weight Helper.
     */
    const handleClearHistory = () => {
        dispatch({ type: 'CLEAR_HISTORY' });
    };

    /**
     * Handles the lock toggle button click event.
     * Toggles the lock status for the current LoRA and loraParams.
     */
    const handleToggleLockStatus = () => {
        dispatch({ type: 'TOGGLE_LOCK_STATUS' });
    };

    /**
     * Handles the previous history button click event.
     * Navigates to the previous history state.
     */
    const handlePrevHistory = () => {
        const newIndex = Math.max(0, state.historyIndex - 1);
        const history = histories[newIndex];
        const loraParams = createLoraParamsState(history.loraParams, history.selectedModelType, history.selectedLoraBlockType);
        const locked = historyManager.isLocked(state.loraName, history.loraParams);
        const preset = getPreset(history.selectedModelType, history.selectedLoraBlockType, state.lbwPresets, loraParams.weights);
        dispatch({ type: 'SET_HISTORY', payload: { historyIndex: newIndex, weightState: loraParams, locked: locked, preset: preset } });
    };

    /**
     * Handles the next history button click event.
     * Navigates to the next history state.
     */
    const handleNextHistory = () => {
        const newIndex = Math.min(histories.length - 1, state.historyIndex + 1);
        const history = histories[newIndex];
        const loraParams = createLoraParamsState(history.loraParams, history.selectedModelType, history.selectedLoraBlockType);
        const locked = historyManager.isLocked(state.loraName, history.loraParams);
        const preset = getPreset(history.selectedModelType, history.selectedLoraBlockType, state.lbwPresets, loraParams.weights);
        dispatch({ type: 'SET_HISTORY', payload: { historyIndex: newIndex, weightState: loraParams, locked: locked, preset: preset } });
    };

    return (
        <header onMouseDown={handleMouseDown}>
            <span>
                <span className={`lock ${lock ? 'like' : 'unlike'}`} style={getVisibilityStyle(!state.weightState.xyzMode)} onClick={handleToggleLockStatus}>
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M21,10H19V7A7,7,0,0,0,5,7v3H3a1,1,0,0,0-1,1v9a4,4,0,0,0,4,4H18a4,4,0,0,0,4-4V11A1,1,0,0,0,21,10Zm-9,9.5A2.5,2.5,0,1,1,14.5,17,2.5,2.5,0,0,1,12,19.5ZM15,10H9V7a3,3,0,0,1,6,0v3Z"></path>
                    </svg>
                </span>
                <label className="name">{loraName}</label>
            </span>
            <div className="history" style={getDisplayStyle(histories.length > 1)}>
                <a className="icon" onClick={handleClearHistory}>
                    clear
                </a>
                <div className="page">
                    <a className="icon" onClick={handlePrevHistory} style={getVisibilityStyle(state.historyIndex > 0)}>
                        &lt;
                    </a>
                    <label className="page-label">{state.historyIndex + 1 + '/' + histories.length}</label>
                    <a className="icon" onClick={handleNextHistory} style={getVisibilityStyle(state.historyIndex < histories.length - 1)}>
                        &gt;
                    </a>
                </div>
            </div>
        </header>
    );
};
