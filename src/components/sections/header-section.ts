import * as historyManager from '@/shared/manager/history-manager';
import * as globalState from '@/shared/state/global-weight-helper-state';
import { getPreset } from '@/shared/utils/common-utils';
import { getDisplayStyle, getVisibilityStyle } from '@/shared/utils/helper-utils';
import { createLoraParamsState } from '@/shared/utils/state-utils';

import { TemplateResult, html } from 'lit-html';

// ドラッグ状態を管理するグローバル変数
let isDragging = false;
let offset = { x: 0, y: 0 };

/**
 * HeaderSection component displays the title bar of the Weight Helper.
 * Provides LoRA name display, lock toggle, and history navigation controls.
 * @param loraName - The name of the LoRA model.
 * @param lock - The current lock status.
 * @returns The HeaderSection template.
 */
export function createHeaderSection(loraName: string, lock: boolean): TemplateResult {
    const state = globalState.getGlobalState();
    const histories = historyManager.getHistories(state.loraName);

    /**
     * Handles the mouse down event for dragging the header.
     * @param e - The mouse event.
     */
    const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        const el = document.getElementById('weight-helper');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        offset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
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
        if (!isDragging) return;

        const x = e.clientX - offset.x + window.scrollX;
        const y = e.clientY - offset.y + window.scrollY;

        globalState.setPosition(y, x);
    };

    /**
     * Handles the mouse up event to stop dragging the header.
     * Removes the event listeners for mouse move and mouse up.
     */
    const handleMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    /**
     * Handles the clear history button click event.
     * Clears the history of the Weight Helper.
     */
    const handleClearHistory = () => {
        globalState.clearHistory();
    };

    /**
     * Handles the lock toggle button click event.
     * Toggles the lock status for the current LoRA and loraParams.
     */
    const handleToggleLockStatus = () => {
        globalState.toggleLockStatus();
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
        globalState.setHistory({ historyIndex: newIndex, weightState: loraParams, locked: locked, preset: preset });
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
        globalState.setHistory({ historyIndex: newIndex, weightState: loraParams, locked: locked, preset: preset });
    };

    return html`
        <header @mousedown=${handleMouseDown}>
            <span>
                <span class="lock ${lock ? 'like' : 'unlike'}" style="${getVisibilityStyle(!state.weightState.xyzMode)}" @click=${handleToggleLockStatus}>
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                            d="M21,10H19V7A7,7,0,0,0,5,7v3H3a1,1,0,0,0-1,1v9a4,4,0,0,0,4,4H18a4,4,0,0,0,4-4V11A1,1,0,0,0,21,10Zm-9,9.5A2.5,2.5,0,1,1,14.5,17,2.5,2.5,0,0,1,12,19.5ZM15,10H9V7a3,3,0,0,1,6,0v3Z"
                        ></path>
                    </svg>
                </span>
                <label class="name">${loraName}</label>
            </span>
            <div class="history" style="${getDisplayStyle(histories.length > 1)}">
                <a class="icon" @click=${handleClearHistory}>clear</a>
                <div class="page">
                    <a class="icon" @click=${handlePrevHistory} style="${getVisibilityStyle(state.historyIndex > 0)}">&lt;</a>
                    <label class="page-label">${state.historyIndex + 1}/${histories.length}</label>
                    <a class="icon" @click=${handleNextHistory} style="${getVisibilityStyle(state.historyIndex < histories.length - 1)}">&gt;</a>
                </div>
            </div>
        </header>
    `;
}
