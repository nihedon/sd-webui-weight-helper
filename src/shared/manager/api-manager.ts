let metadataAbortController: AbortController | null = null;
let previewAbortController: AbortController | null = null;

/**
 * Returns the global AbortController for metadata fetch requests.
 * Creates a new controller if one doesn't exist.
 * @returns The AbortController instance for metadata requests.
 */
export function getMetadataAbortController(): AbortController {
    if (!metadataAbortController) {
        metadataAbortController = new AbortController();
    }
    return metadataAbortController;
}

/**
 * Aborts any ongoing metadata fetch request and creates a new AbortController.
 * @returns The new AbortController instance for metadata requests.
 */
export function resetMetadataAbortController(): AbortController {
    if (metadataAbortController) {
        metadataAbortController.abort();
    }
    metadataAbortController = new AbortController();
    return metadataAbortController;
}

/**
 * Returns the global AbortController for preview fetch requests.
 * Creates a new controller if one doesn't exist.
 * @returns The AbortController instance for preview requests.
 */
export function getPreviewAbortController(): AbortController {
    if (!previewAbortController) {
        previewAbortController = new AbortController();
    }
    return previewAbortController;
}

/**
 * Aborts any ongoing preview fetch request and creates a new AbortController.
 * @returns The new AbortController instance for preview requests.
 */
export function resetPreviewAbortController(): AbortController {
    if (previewAbortController) {
        previewAbortController.abort();
    }
    previewAbortController = new AbortController();
    return previewAbortController;
}
