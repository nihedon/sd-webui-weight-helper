import * as configManager from '@/shared/manager/config-manager';
import * as historyManager from '@/shared/manager/history-manager';
import { createWeightHelperInitState } from '@/shared/utils/state-utils';

import * as context from '@/components/contexts/weight-helper-context';

declare function gradioApp(): HTMLElement;
declare function onUiLoaded(callback: VoidFunction): void;
declare function onOptionsChanged(callback: VoidFunction): void;

/**
 * Promise resolver for the initialization process.
 * Used to signal when options have been loaded and initialization can proceed.
 */
export let resolveInitialized: ((value: boolean) => void) | null;

/**
 * Promise that resolves when the Weight Helper is ready to initialize.
 * Used to defer initialization until options are loaded.
 */
const initializedPromise = new Promise<boolean>((resolve) => {
    resolveInitialized = resolve;
});

/**
 * Entry point for the Weight Helper React application.
 * Handles initialization, theme adaptation, and state setup when the UI is loaded or options are changed.
 */
historyManager.loadLocalStorage();

onUiLoaded(() => {
    if (!gradioApp().querySelector('#lbw_ratiospreset')) {
        return;
    }
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--body-text-color').trim();
    const textColorRgb = textColor
        .slice(1)
        .match(/.{1,2}/g)!
        .map((hex) => parseInt(hex, 16));
    const textColorRgba = [...textColorRgb, 0.3];
    document.documentElement.style.setProperty('--weight-helper-shadow', `rgba(${textColorRgba.join(',')})`);
    document.documentElement.style.setProperty('--weight-helper-slider_size', String(window.opts.weight_helper_slider_length));

    initializedPromise.then(() => {
        const weightHelperContainer = document.createElement('div');
        weightHelperContainer.id = 'weight-helper-container';
        gradioApp().appendChild(weightHelperContainer);

        configManager.initialize();
        context.initialize(createWeightHelperInitState());
    });
});

onOptionsChanged(() => {
    if (resolveInitialized) {
        resolveInitialized(true);
        resolveInitialized = null;
    }
});
