import { Fragment, h } from 'preact';

import { getEditor, getTabId } from '@/shared/state/current-state';
import { withoutPromptAssist } from '@/shared/utils/common-utils';
import { getDisplayStyle, getVisibilityStyle } from '@/shared/utils/helper-utils';

import * as context from '@/components/contexts/weight-helper-context';

declare function extraNetworksRequestMetadata(e: Event, type: string, modelName: string): void;
declare function extraNetworksEditUserMetadata(e: Event, tabId: string, type: string, modelName: string): void;

/**
 * PreviewSection component displays information about the selected model.
 * Shows preview image, metadata actions, trigger word insertion buttons, and model description.
 * @param preview - The preview state containing model information.
 * @param topComponent - Reference to the top-level component for positioning.
 * @returns The PreviewSection component.
 */
export const PreviewSection = ({ preview, topComponent }: { preview: context.PreviewState; topComponent: HTMLDivElement | null }) => {
    const { state, dispatch } = context.useWeightHelper();

    /**
     * Handles the click event to show internal metadata for the model.
     * @param e - The click event.
     */
    const handleShowMetadata = (e: h.JSX.TargetedEvent<HTMLDivElement, Event>) => {
        extraNetworksRequestMetadata(e, 'lora', preview.modelName);
    };

    /**
     * Handles the click event to edit user metadata for the model.
     * @param e - The click event.
     */
    const handleEditMetadata = (e: h.JSX.TargetedEvent<HTMLDivElement, Event>) => {
        extraNetworksEditUserMetadata(e, getTabId(), 'lora', state.previewState.modelName);
    };

    /**
     * Handles the click event to open the Civitai model page in a new tab.
     */
    const handleOpenCivitai = () => {
        window.open(`https://civitai.com/models/${preview.modelId}`, '_blank');
    };

    /**
     * Handles the click event to show the preview description.
     */
    const handleOpenPreviewDescription = () => {
        dispatch({
            type: 'SET_PREVIEW_DESCRIPTION_VISIBLE',
            payload: true,
        });
    };

    /**
     * Handles the click event to close the preview description.
     */
    const handleClosePreviewDescription = () => {
        dispatch({
            type: 'SET_PREVIEW_DESCRIPTION_VISIBLE',
            payload: false,
        });
    };

    /**
     * Handles the click event to insert trigger words into the prompt or negative prompt textarea.
     */
    const handleInsertTriggerWords = () => {
        const tabId = getTabId();
        let promptTextarea = document.querySelector(`#${tabId}_prompt textarea`) as HTMLTextAreaElement;
        let negativeTextarea = document.querySelector(`#${tabId}_neg_prompt textarea`) as HTMLTextAreaElement | undefined;

        const textarea = getEditor();
        if (textarea === negativeTextarea) {
        } else if (textarea !== promptTextarea) {
            promptTextarea = textarea;
            negativeTextarea = undefined;
        }
        if (!window.opts.weight_helper_using_execCommand) {
            const insert = () => {
                const zipped = [
                    { triggerWords: preview.triggerWords, textarea: promptTextarea },
                    { triggerWords: preview.negativeTriggerWords, textarea: negativeTextarea },
                ];
                for (const { triggerWords, textarea } of zipped) {
                    if (triggerWords.length > 0 && textarea) {
                        let words = triggerWords.join(', ');
                        if (textarea.value) words = ', ' + words;
                        textarea.value += words;
                    }
                }
            };
            insert();
        } else {
            const insert = () => {
                const zipped = [
                    { triggerWords: preview.triggerWords, textarea: promptTextarea },
                    { triggerWords: preview.negativeTriggerWords, textarea: negativeTextarea },
                ];
                for (const { triggerWords, textarea } of zipped) {
                    if (triggerWords.length > 0 && textarea) {
                        let words = triggerWords.join(', ');
                        if (textarea.value) words = ', ' + words;
                        textarea.focus();
                        const eolIndex = textarea.value.length;
                        textarea.setSelectionRange(eolIndex, eolIndex);
                        document.execCommand('insertText', false, words);
                    }
                }
            };
            withoutPromptAssist(() => {
                insert();
            });
        }
        dispatch({
            type: 'HIDE_TAG_INSERT_BUTTON',
        });
    };

    const clientWidth = +(topComponent?.clientWidth || 0);
    const margin = 6;
    const pos: Record<string, string> = {};
    switch (window.opts.weight_helper_preview_position) {
        case 'Bottom Right':
            pos.bottom = 0 + 'px';
            pos.left = clientWidth + margin + 'px';
            break;
        case 'Top Left':
            pos.top = 0 + 'px';
            pos.right = clientWidth - margin + 'px';
            break;
        case 'Bottom Left':
            pos.right = clientWidth - margin + 'px';
            pos.bottom = 0 + 'px';
            break;
        default:
            pos.top = 0 + 'px';
            pos.left = clientWidth + margin + 'px';
            break;
    }

    return (
        <div className="preview-pane card" data-name={preview.modelName} style={{ ...pos }}>
            <img className="preview" src={preview.thumbUrl} style={{ height: `${window.opts.weight_helper_preview_height}px` }} />
            <div className="action-row button-top" style={getVisibilityStyle(!preview.isDescriptionVisible)}>
                {preview.modelName && preview.hasMetadata && typeof extraNetworksRequestMetadata === 'function' && (
                    <div className="metadata-btn card-btn" title="Show internal metadata" onClick={handleShowMetadata}></div>
                )}
                {preview.modelName && typeof extraNetworksEditUserMetadata === 'function' && (
                    <div className="edit-btn card-btn" title="Edit metadata" onClick={handleEditMetadata}></div>
                )}
                {preview.modelId && <div className="civitai-btn card-btn" title="Open civitai" onClick={handleOpenCivitai}></div>}
                {(preview.triggerWords.length > 0 || preview.negativeTriggerWords.length > 0) && (
                    <div
                        className="add-trigger-btn card-btn"
                        title="Add trigger words"
                        onClick={handleInsertTriggerWords}
                        style={getDisplayStyle(preview.isTagInsertButtonVisible)}
                    ></div>
                )}
            </div>

            {preview.description && (
                <Fragment>
                    <div className="action-row button-bottom" style={getVisibilityStyle(!preview.isDescriptionVisible)}>
                        <div className="card-btn note-btn" onClick={handleOpenPreviewDescription}></div>
                    </div>
                    <textarea className="description" style={getVisibilityStyle(preview.isDescriptionVisible)}>
                        {preview.description}
                    </textarea>
                    <div
                        className="card-btn description-close-btn"
                        style={getVisibilityStyle(preview.isDescriptionVisible)}
                        onClick={handleClosePreviewDescription}
                    ></div>
                </Fragment>
            )}
        </div>
    );
};
