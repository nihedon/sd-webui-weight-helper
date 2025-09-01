import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';

let _historiesStore: Record<string, { loraParams: string; selectedLoraBlockType: LoraBlockTypes; selectedModelType: ModelTypes }[]> = {};
const _lockStore: Record<string, Set<string>> = {};

/**
 * Retrieves the history list for the given LoRA name.
 * @param loraName - The name of the LoRA model.
 * @returns An array of history objects for the LoRA.
 */
export function getHistories(loraName: string): { loraParams: string; selectedLoraBlockType: LoraBlockTypes; selectedModelType: ModelTypes }[] {
    return _historiesStore[loraName] ?? [];
}

/**
 * Adds a new history entry for the given LoRA name.
 * If a history with the same loraParams exists, it is replaced.
 * @param loraName - The name of the LoRA model.
 * @param history - The history object to add.
 */
export function addHistory(loraName: string, history: { loraParams: string; selectedLoraBlockType: LoraBlockTypes; selectedModelType: ModelTypes }) {
    history = {
        loraParams: history.loraParams,
        selectedLoraBlockType: history.selectedLoraBlockType,
        selectedModelType: history.selectedModelType,
    };
    if (loraName in _historiesStore) {
        _historiesStore[loraName] = _historiesStore[loraName].filter((h) => h.loraParams !== history.loraParams);
        _historiesStore[loraName].push(history);
    } else {
        _historiesStore[loraName] = [history];
    }
}

/**
 * Clears all unlocked history entries for the given LoRA name.
 * Only locked histories are retained.
 * @param loraName - The name of the LoRA model.
 */
export function clearHistories(loraName: string) {
    if (loraName in _historiesStore) {
        const lockSet = _lockStore[loraName];
        _historiesStore[loraName] = _historiesStore[loraName].filter((h) => lockSet && lockSet.has(h.loraParams));
    }
}

/**
 * Adds a lock for the given LoRA name and loraParams.
 * @param loraName - The name of the LoRA model.
 * @param loraParams - The loraParams string to lock.
 */
export function addLock(loraName: string, loraParams: string) {
    if (loraName in _lockStore) {
        _lockStore[loraName].add(loraParams);
    } else {
        _lockStore[loraName] = new Set([loraParams]);
    }
}

/**
 * Removes a lock for the given LoRA name and loraParams.
 * @param loraName - The name of the LoRA model.
 * @param loraParams - The loraParams string to unlock.
 */
export function removeLock(loraName: string, loraParams: string) {
    if (loraName in _lockStore) {
        _lockStore[loraName].delete(loraParams);
    }
}

/**
 * Checks if the given loraParams is locked for the specified LoRA name.
 * @param loraName - The name of the LoRA model.
 * @param loraParams - The loraParams string to check.
 * @returns True if locked, false otherwise.
 */
export function isLocked(loraName: string, loraParams: string) {
    if (loraName in _lockStore) {
        return _lockStore[loraName].has(loraParams);
    }
    return false;
}

/**
 * Stores the histories and lock information to localStorage.
 */
export function storeLocalStorage() {
    localStorage.setItem('wh://histories', JSON.stringify(_historiesStore));
    const lockObj: Record<string, string[]> = {};
    for (const key in _lockStore) {
        lockObj[key] = Array.from(_lockStore[key]);
    }
    localStorage.setItem('wh://locks', JSON.stringify(lockObj));
}

/**
 * Loads the histories and lock information from localStorage.
 */
export function loadLocalStorage() {
    const histories = localStorage.getItem('wh://histories');
    if (histories) {
        _historiesStore = JSON.parse(histories);
    }
    const locks = localStorage.getItem('wh://locks');
    if (locks) {
        const lockObj = JSON.parse(locks);
        for (const key in lockObj) {
            _lockStore[key] = new Set(lockObj[key]);
        }
    }
}
