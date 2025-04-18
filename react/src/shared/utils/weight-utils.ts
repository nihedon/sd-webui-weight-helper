import * as configManager from '@/shared/manager/config-manager';
import { WeightControllerTypes } from '@/shared/types/lora-types';
import { expandRange } from '@/shared/utils/common-utils';

import * as context from '@/components/contexts/weight-helper-context';

/**
 * Merges the current weights with the given block groups.
 * Ensures that all blocks from the expanded groups are present in the weights object.
 * If a block is missing, it is initialized with the default LBW value.
 * @param currentWeights - The current record of block weights.
 * @param groups - The array of block group strings (may include range patterns).
 * @returns The updated record of block weights including all blocks from the groups.
 */
export function mergeWeightsWithGroups(
    currentWeights: Record<string, context.WeightControlState>,
    groups: string[],
): Record<string, context.WeightControlState> {
    const updatedWeights = { ...currentWeights };

    const allBlocks: string[] = [];
    groups.forEach((group) => {
        const expandedBlocks = expandRange(group);
        expandedBlocks.forEach((block) => {
            if (!allBlocks.includes(block)) {
                allBlocks.push(block);
            }
        });
    });

    allBlocks.forEach((block) => {
        if (!updatedWeights[block]) {
            updatedWeights[block] = {
                initValue: configManager.getWeightControllerConfig(WeightControllerTypes.LBW).default,
                value: configManager.getWeightControllerConfig(WeightControllerTypes.LBW).default,
                sliderMin: configManager.getWeightControllerConfig(WeightControllerTypes.LBW).min,
                sliderMax: configManager.getWeightControllerConfig(WeightControllerTypes.LBW).max,
            };
        }
    });

    return updatedWeights;
}
