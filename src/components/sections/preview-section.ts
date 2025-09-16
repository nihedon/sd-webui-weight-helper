import { getEditor, getTabId } from '@/shared/state/current-state';
import * as globalState from '@/shared/state/global-weight-helper-state';
import { withoutPromptAssist } from '@/shared/utils/common-utils';
import { getDisplayStyle, getVisibilityStyle } from '@/shared/utils/helper-utils';

import { TemplateResult, html } from 'lit-html';

declare function extraNetworksRequestMetadata(e: Event, type: string, modelName: string): void;
declare function extraNetworksEditUserMetadata(e: Event, tabId: string, type: string, modelName: string): void;

/**
 * PreviewSection creates information display about the selected model.
 * Shows preview image, metadata actions, trigger word insertion buttons, and model description.
 * @param preview - The preview state containing model information.
 * @returns The PreviewSection template.
 */
export function createPreviewSection(preview: globalState.PreviewState): TemplateResult {
    /**
     * Handles the click event to show internal metadata for the model.
     * @param e - The click event.
     */
    const handleShowMetadata = (e: Event) => {
        extraNetworksRequestMetadata(e, 'lora', preview.modelName);
    };

    /**
     * Handles the click event to edit user metadata for the model.
     * @param e - The click event.
     */
    const handleEditMetadata = (e: Event) => {
        extraNetworksEditUserMetadata(e, getTabId(), 'lora', preview.modelName);
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
        globalState.setPreviewDescriptionVisible(true);
    };

    /**
     * Handles the click event to close the preview description.
     */
    const handleClosePreviewDescription = () => {
        globalState.setPreviewDescriptionVisible(false);
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
        if (!opts.weight_helper_using_execCommand) {
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
        globalState.hideTagInsertButton();
    };

    const classNames = ['preview-pane', 'card'];

    // position based on settings
    switch (opts.weight_helper_preview_position) {
        case 'Bottom Right':
            classNames.push('preview-bottom-right');
            break;
        case 'Top Left':
            classNames.push('preview-top-left');
            break;
        case 'Bottom Left':
            classNames.push('preview-bottom-left');
            break;
        default:
            classNames.push('preview-top-right');
            break;
    }

    return html`
        <div class="${classNames.join(' ')}" data-name="${preview.modelName}">
            <img class="preview" src="${preview.thumbUrl}" style="height: ${opts.weight_helper_preview_height}px" />
            <div class="action-row button-top" style="${getVisibilityStyle(!preview.isDescriptionVisible)}">
                ${preview.modelName && preview.hasMetadata && typeof extraNetworksRequestMetadata === 'function'
                    ? html` <div class="metadata-btn card-btn" title="Show internal metadata" @click="${handleShowMetadata}"></div> `
                    : ''}
                ${preview.modelName && typeof extraNetworksEditUserMetadata === 'function'
                    ? html` <div class="edit-btn card-btn" title="Edit metadata" @click="${handleEditMetadata}"></div> `
                    : ''}
                ${preview.modelId ? html` <div class="civitai-btn card-btn" title="Open civitai" @click="${handleOpenCivitai}"></div> ` : ''}
                ${preview.triggerWords.length > 0 || preview.negativeTriggerWords.length > 0
                    ? html`
                          <div
                              class="add-trigger-btn card-btn"
                              title="Add trigger words"
                              @click="${handleInsertTriggerWords}"
                              style="${getDisplayStyle(preview.isTagInsertButtonVisible)}"
                          ></div>
                      `
                    : ''}
            </div>

            ${preview.description
                ? html`
                      <div class="action-row button-bottom" style="${getVisibilityStyle(!preview.isDescriptionVisible)}">
                          <div class="card-btn note-btn" @click="${handleOpenPreviewDescription}"></div>
                      </div>
                      <textarea class="description" style="${getVisibilityStyle(preview.isDescriptionVisible)}">
                    ${preview.description}
                </textarea
                      >
                      <div
                          class="card-btn description-close-btn"
                          style="${getVisibilityStyle(preview.isDescriptionVisible)}"
                          @click="${handleClosePreviewDescription}"
                      ></div>
                  `
                : ''}
        </div>
    `;
}
