// このファイルはlit-html移行により不要になりました
// React/Preactのhooksは使用しないため、ダミーファイルとして残しています
import { BasicState, getGlobalState } from '@/shared/state/global-weight-helper-state';

/**
 * 互換性のためのダミー関数
 * lit-htmlベースではこの関数は使用されません
 */
export function useGlobalState(): BasicState {
    return getGlobalState();
}
