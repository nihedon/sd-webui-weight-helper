import * as configManager from '@/shared/manager/config-manager';
import * as globalState from '@/shared/state/global-weight-helper-state';
import { expandRange } from '@/shared/utils/helper-utils';

import { createWeightController } from '@/components/sections/common-section';

import { TemplateResult, html } from 'lit-html';

/**
 * LbwSection creates weight controllers for LoRA block weights.
 * Shows groups of blocks based on the current model and block type configuration.
 * @returns The LbwSection template.
 */
export function createLbwSection(): TemplateResult {
    const state = globalState.getGlobalState();
    const { blockGroups, weightState } = state;
    const { selectedModelType, selectedLoraBlockType } = weightState;

    const maskedBlockSet = new Set(configManager.getMaskedLbwBlocks(selectedModelType, selectedLoraBlockType));

    return html`
        <div class="lbw-column">
            ${blockGroups.map(
                (cols) => html`
                    <div class="f col g-2" style="display: flex">
                        ${cols.map(
                            (group) => html`
                                <div class="border p f g-2 col">
                                    ${expandRange(group).map((blockLabel) =>
                                        maskedBlockSet.has(blockLabel) && weightState.weights[blockLabel]
                                            ? html` <div class="f g-2">${createWeightController(blockLabel, weightState.weights)}</div> `
                                            : '',
                                    )}
                                </div>
                            `,
                        )}
                    </div>
                `,
            )}
        </div>
    `;
}
