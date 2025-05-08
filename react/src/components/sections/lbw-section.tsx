// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';

import * as configManager from '@/shared/manager/config-manager';
import { expandRange } from '@/shared/utils/helper-utils';
import { disabled } from '@/shared/utils/helper-utils';

import * as context from '@/components/contexts/weight-helper-context';
import { WeightController } from '@/components/sections/common-section';

/**
 * LbwSection component displays weight controllers for LoRA block weights.
 * Shows groups of blocks based on the current model and block type configuration.
 * @returns The LbwSection component.
 */
export const LbwSection = () => {
    const { state } = context.useWeightHelper();
    const { blockGroups, weightState: weightState } = state;
    const { selectedModelType, selectedLoraBlockType } = weightState;

    const maskedBlockSet = new Set(configManager.getMaskedLbwBlocks(selectedModelType, selectedLoraBlockType));

    return (
        <div class="lbw-column">
            {blockGroups.map((cols) => (
                <div className="f col g-2" key={`${selectedModelType}-${selectedLoraBlockType}-${state.usingBlocks}`} style={{ display: 'flex' }}>
                    {cols.map((group) => (
                        <div className="border p f g-2 col" key={`${group}-${selectedModelType}-${selectedLoraBlockType}-${state.usingBlocks}`}>
                            {expandRange(group).map(
                                (blockLabel) =>
                                    maskedBlockSet.has(blockLabel) &&
                                    weightState.weights[blockLabel] && (
                                        <div class="f g-2" key={`${blockLabel}-${selectedModelType}-${selectedLoraBlockType}-${disabled(state, blockLabel)}`}>
                                            <WeightController label={blockLabel} values={weightState.weights} />
                                        </div>
                                    ),
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};
